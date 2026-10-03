// Web Audio path for one side of the call (research.md R3, test-log Finding 7):
//
//   track -> input gain -> [input analyser: AGC + speech check]
//                       -> AGC gain -> limiter -> [analyser: meter]
//                                              -> MediaStreamAudioDestination (track for SpeechRecognition)
//
// Nothing is connected to audioContext.destination, so the agent always hears the call
// exactly as before (FR-004); the AGC only changes what the speech service hears.
import { createAgc } from '../core/agc.js';

const AGC_INTERVAL_MS = 100;

function rmsOf(analyser, samples) {
  analyser.getFloatTimeDomainData(samples);
  let sum = 0;
  for (const v of samples) sum += v * v;
  return Math.min(1, Math.sqrt(sum / samples.length));
}

export function createAudioPath(audioContext, track, { gain = 1, agc = true } = {}) {
  const source = audioContext.createMediaStreamSource(new MediaStream([track]));
  const inputGain = audioContext.createGain();
  inputGain.gain.value = gain;
  const inputAnalyser = audioContext.createAnalyser();
  inputAnalyser.fftSize = 2048;
  const agcGain = audioContext.createGain();
  // Catches sudden loud speech while the AGC gain is still high.
  const limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 6;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  const destination = audioContext.createMediaStreamDestination();

  source.connect(inputGain);
  inputGain.connect(inputAnalyser);
  inputGain.connect(agcGain);
  agcGain.connect(limiter);
  limiter.connect(analyser);
  limiter.connect(destination);

  const inputSamples = new Float32Array(inputAnalyser.fftSize);
  const samples = new Float32Array(analyser.fftSize);
  const controller = agc ? createAgc() : null;
  let speech = false;
  const timer = controller && setInterval(() => {
    const out = controller.update(rmsOf(inputAnalyser, inputSamples), AGC_INTERVAL_MS);
    speech = out.speech;
    agcGain.gain.setTargetAtTime(out.gain, audioContext.currentTime, 0.05);
  }, AGC_INTERVAL_MS);

  return {
    recognitionTrack: destination.stream.getAudioTracks()[0],

    // Level after the AGC, 0..1 (for the meter and the "no call sound" hint).
    getLevel: () => rmsOf(analyser, samples),

    // Whether someone is speaking right now (adaptive to the background noise).
    isSpeech: () => speech,

    get agcGain() { return controller?.gain ?? 1; },

    stop() {
      clearInterval(timer);
      try {
        source.disconnect();
        inputGain.disconnect();
        agcGain.disconnect();
        limiter.disconnect();
      } catch { /* already disconnected */ }
      destination.stream.getTracks().forEach((t) => t.stop());
    },
  };
}
