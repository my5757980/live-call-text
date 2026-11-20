// Replaces getUserMedia with a stand-in microphone that plays a fixture clip, or that
// fails the way a blocked or missing microphone does (research.md R9).
// Chrome's --use-fake-device-for-media-stream is not used: it also replaces screen capture.
//
// Hooks for tests (inside the page):
//   window.__playMic(name)  plays a clip into the stand-in microphone
//   window.__micMode        'clip' | 'denied' | 'missing': overrides the mode for later calls
//   window.__micTrack       the track handed to the page last; dispatch `ended` on it to
//                           act out a headset being unplugged
export async function installStandInMic(context, { clip = 'en', mode = 'clip' } = {}) {
  await context.addInitScript(({ clip, mode }) => {
    const md = navigator.mediaDevices;
    if (!md) return;
    const original = md.getUserMedia ? md.getUserMedia.bind(md) : null;
    let ctx = null;

    const decode = async (name) => {
      const resp = await fetch(`/__test/audio/${name}.mp3`);
      return ctx.decodeAudioData(await resp.arrayBuffer());
    };

    md.getUserMedia = async (constraints) => {
      if (!constraints || !constraints.audio) return original(constraints);
      window.__micConstraints = JSON.parse(JSON.stringify(constraints));
      const now = window.__micMode ?? mode;
      if (now === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
      if (now === 'missing') throw new DOMException('Requested device not found', 'NotFoundError');
      ctx = ctx || new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      const first = await decode(clip);
      // Plays the clip (or another named clip) into the stand-in microphone.
      window.__playMic = async (name) => {
        const buffer = name && name !== clip ? await decode(name) : first;
        await ctx.resume();
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(dest);
        src.start();
        return new Promise((resolve) => { src.onended = () => resolve(); });
      };
      window.__micTrack = dest.stream.getAudioTracks()[0];
      return dest.stream;
    };
  }, { clip, mode });
}
