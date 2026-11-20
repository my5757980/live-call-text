// Worker entry: /ws goes to the relay hub; everything else is a static page from web/
// (Workers Static Assets, research.md R6).
import { Hub } from './hub.js';
import { checkWsRequest } from './hub-logic.js';

export { Hub };

const REFUSALS = {
  400: 'Bad request',
  403: 'Not allowed from this site',
  426: 'Expected a WebSocket upgrade',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      // Junk and other websites are refused here, before the hub is woken, so they never
      // use up the hub's free allowance.
      const check = checkWsRequest({
        url: request.url,
        upgrade: request.headers.get('Upgrade'),
        origin: request.headers.get('Origin'),
      });
      if (!check.ok) return new Response(REFUSALS[check.status], { status: check.status });
      const hub = env.HUB.get(env.HUB.idFromName('hub'));
      return hub.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
