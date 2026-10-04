/**
 * Logic for the Vercel Routing Middleware in ./middleware.js (spec 002,
 * ADR-0002). Kept in an ES module so Node's test runner can import it; the
 * Vercel build bundles it into the middleware.
 */

/**
 * Link-preview services. COPY of CRAWLER_UA in
 * motoclub-connect-backend/controllers/shareController.js — keep them
 * identical. Both repos test against the same fixture (middleware.fixtures.json
 * here, test/fixtures/crawler-user-agents.json there).
 */
export const CRAWLER_UA =
  /facebookexternalhit|facebookcatalog|facebot|twitterbot|slackbot|linkedinbot|whatsapp|viber|telegrambot|discordbot|pinterest|redditbot|applebot|skypeuripreview|embedly|vkshare|googlebot|bingbot|quora link preview|outbrain|nuzzel|w3c_validator|bitlybot|flipboard|tumblr|xing-contenttabreceiver|line-podcast|snapchat/i;

export function isCrawler(userAgent) {
  return typeof userAgent === 'string' && CRAWLER_UA.test(userAgent);
}

const COLLECTION_PATH = /^\/clubs\/[^/]+\/collection\/([0-9a-fA-F]{24})(?:\/payment)?\/?$/;

/** The collection ID of an app collection link, or null for any other path. */
export function collectionIdFromPath(pathname) {
  const match = COLLECTION_PATH.exec(pathname || '');
  return match ? match[1] : null;
}

const DEFAULT_API_BASE = 'https://moto-api.pspipes.net';
const DEFAULT_TIMEOUT_MS = 2500;

/** First entry of x-forwarded-for: the client as Vercel saw it. */
function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0].trim();
}

/**
 * Returns a Response with the backend's preview for link-preview services on
 * app collection links, or undefined to let Vercel serve the static app.
 * @param {Request} request
 * @param {{ env?: Record<string, string|undefined>, fetchImpl?: typeof fetch, timeoutMs?: number }} [options]
 */
export async function handle(request, { env = {}, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  // People first, and nothing else for them: no work, no network (FR-004).
  const userAgent = request.headers.get('user-agent');
  if (!isCrawler(userAgent)) return undefined;

  const collectionId = collectionIdFromPath(new URL(request.url).pathname);
  if (!collectionId) return undefined;

  const base = (env.SHARE_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, '');
  const headers = { 'user-agent': userAgent };
  const ip = clientIp(request);
  if (ip) headers['x-share-client-ip'] = ip;
  if (env.SHARE_PROXY_SECRET) headers['x-share-proxy-secret'] = env.SHARE_PROXY_SECRET;

  const upstream = await fetchImpl(`${base}/share/collection/${collectionId}`, {
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  });

  // Pass on only what a preview needs; never the backend's session cookie.
  const out = new Headers({ 'content-type': upstream.headers.get('content-type') || 'text/html; charset=utf-8' });
  const cacheControl = upstream.headers.get('cache-control');
  if (cacheControl) out.set('cache-control', cacheControl);
  return new Response(await upstream.text(), { status: 200, headers: out });
}

/** Wrap a handler so any error falls through to the static app (fail open). */
export function failOpen(handler) {
  return async (request) => {
    try {
      return await handler(request);
    } catch {
      return undefined;
    }
  };
}
