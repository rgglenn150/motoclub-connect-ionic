// Spec 002: Vercel Routing Middleware for rich link previews on app collection
// URLs. Run with `npm run test:middleware` (Node's built-in test runner).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { isCrawler, collectionIdFromPath, handle } from './middleware-core.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./middleware.fixtures.json', import.meta.url)));
const ID = '6ac1bbb37c9431304f91577f';
const CLUB = '69391c68921b0c1bd1ff07c7';

describe('isCrawler (same list as the backend, FR-008)', () => {
  for (const ua of fixture.crawlers) {
    test(`link-preview service: ${ua.slice(0, 60)}`, () => assert.equal(isCrawler(ua), true));
  }
  for (const ua of fixture.people) {
    test(`person: ${ua.slice(0, 60)}`, () => assert.equal(isCrawler(ua), false));
  }
  test('missing or empty User-Agent is a person', () => {
    assert.equal(isCrawler(undefined), false);
    assert.equal(isCrawler(null), false);
    assert.equal(isCrawler(''), false);
  });
});

describe('collectionIdFromPath', () => {
  test('reads the collection page and its payment variant', () => {
    assert.equal(collectionIdFromPath(`/clubs/${CLUB}/collection/${ID}`), ID);
    assert.equal(collectionIdFromPath(`/clubs/${CLUB}/collection/${ID}/payment`), ID);
  });

  test('tolerates one trailing slash', () => {
    assert.equal(collectionIdFromPath(`/clubs/${CLUB}/collection/${ID}/`), ID);
    assert.equal(collectionIdFromPath(`/clubs/${CLUB}/collection/${ID}/payment/`), ID);
  });

  test('ignores anything else', () => {
    for (const path of [
      `/clubs/${CLUB}/collection/not-an-id`,
      `/clubs/${CLUB}/collection/${ID}/edit`,
      `/clubs/${CLUB}`,
      '/tabs/home',
      `/clubs/${CLUB}/collection/${ID}//`,
      '',
    ]) {
      assert.equal(collectionIdFromPath(path), null, path);
    }
  });
});

describe('middleware.js config (Vercel reads it statically)', () => {
  test('matches only the two collection path shapes', () => {
    const source = fs.readFileSync(new URL('./middleware.js', import.meta.url), 'utf8');
    const matcher = source.match(/export const config = \{\s*matcher:\s*(\[[^\]]*\])/);
    assert.ok(matcher, 'config.matcher literal not found');
    assert.deepEqual(JSON.parse(matcher[1].replace(/'/g, '"').replace(/,\s*]/, ']')), [
      '/clubs/:clubId/collection/:collectionId',
      '/clubs/:clubId/collection/:collectionId/payment',
    ]);
  });
});

// --- Story 1: crawlers get the backend preview -----------------------------

const FB = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const SECRET = 'x'.repeat(40);
const PREVIEW_HTML = '<!DOCTYPE html><html><head><meta property="og:title" content="Demo"/></head></html>';

function crawlerRequest(path = `/clubs/${CLUB}/collection/${ID}`, headers = {}) {
  return new Request(`https://moto.pspipes.net${path}?ref=fb`, {
    headers: { 'user-agent': FB, 'x-forwarded-for': '203.0.113.7, 10.0.0.1', ...headers },
  });
}

/** fetch stand-in that records calls and answers like the backend. */
function fakeBackend(response = () => new Response(PREVIEW_HTML, {
  status: 200,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', 'set-cookie': 'connect.sid=abc' },
})) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    return response();
  };
  return { calls, fetchImpl };
}

describe('handle(): link-preview services get the backend preview (US1)', () => {
  for (const path of [`/clubs/${CLUB}/collection/${ID}`, `/clubs/${CLUB}/collection/${ID}/payment`]) {
    test(`fetches and returns the preview for ${path.endsWith('payment') ? 'the payment variant' : 'the collection page'}`, async () => {
      const { calls, fetchImpl } = fakeBackend();

      const res = await handle(crawlerRequest(path), { env: { SHARE_PROXY_SECRET: SECRET }, fetchImpl });

      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, `https://moto-api.pspipes.net/share/collection/${ID}`);
      assert.equal(calls[0].init.redirect, 'manual');
      assert.ok(res instanceof Response);
      assert.equal(res.status, 200);
      assert.equal(await res.text(), PREVIEW_HTML);
      assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
      assert.equal(res.headers.get('cache-control'), 'public, max-age=300');
      // Only the preview's own headers are passed on (no backend session cookie).
      assert.equal(res.headers.get('set-cookie'), null);
    });
  }

  test('forwards the crawler UA, the real client IP and the proxy secret', async () => {
    const { calls, fetchImpl } = fakeBackend();

    await handle(crawlerRequest(), { env: { SHARE_PROXY_SECRET: SECRET }, fetchImpl });

    const headers = new Headers(calls[0].init.headers);
    assert.equal(headers.get('user-agent'), FB);
    assert.equal(headers.get('x-share-client-ip'), '203.0.113.7');
    assert.equal(headers.get('x-share-proxy-secret'), SECRET);
  });

  test('sends no secret header when the secret is not configured', async () => {
    const { calls, fetchImpl } = fakeBackend();

    await handle(crawlerRequest(), { env: {}, fetchImpl });

    const headers = new Headers(calls[0].init.headers);
    assert.equal(headers.has('x-share-proxy-secret'), false);
    assert.equal(headers.get('x-share-client-ip'), '203.0.113.7');
  });

  test('honours SHARE_API_BASE (preview checks point it elsewhere)', async () => {
    const { calls, fetchImpl } = fakeBackend();

    await handle(crawlerRequest(), { env: { SHARE_API_BASE: 'https://httpbin.org/anything/' }, fetchImpl });

    assert.equal(calls[0].url, `https://httpbin.org/anything/share/collection/${ID}`);
  });
});
