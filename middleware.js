// Vercel Routing Middleware (spec 002, ADR-0002): link-preview services that
// fetch an app collection link get the backend's rich preview; everyone else
// gets the static app exactly as before. Logic lives in ./middleware-core.mjs.
import { failOpen, handle } from './middleware-core.mjs';

export const config = {
  matcher: [
    '/clubs/:clubId/collection/:collectionId',
    '/clubs/:clubId/collection/:collectionId/payment',
  ],
};

// Any error (a bad header, a bug, the backend down) serves the static app:
// a middleware failure must never reach people (red-team F2).
export default failOpen((request) => handle(request, { env: process.env }));
