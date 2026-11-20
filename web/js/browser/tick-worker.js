// Sends a tick to the page every `ms` milliseconds (see ticker.js). A worker's timers keep
// their pace while the page is hidden; the page's own timers do not.
let timer = null;

self.onmessage = (e) => {
  clearInterval(timer);
  timer = e.data?.ms > 0 ? setInterval(() => self.postMessage(0), e.data.ms) : null;
};
