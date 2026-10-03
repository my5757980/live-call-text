// Worker entry: /ws goes to the relay hub; everything else is a static page from web/
// (Workers Static Assets, research.md R6).
import { Hub } from './hub.js';

export { Hub };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      const hub = env.HUB.get(env.HUB.idFromName('hub'));
      return hub.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
