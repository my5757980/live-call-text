# Test audio

Recorded clips from the 2026-10-02 speech tests on the owner's laptop. They are used by the e2e tests
(research.md R9).

| File | Spoken sentence | Test keywords |
|---|---|---|
| `en.mp3` | "hello I want the price of a 2018 Toyota Corolla how many days will Shipping to Karachi take" | Corolla, Karachi |
| `ur.mp3` | "السلام علیکم مجھے ٹویوٹا کرولا کی قیمت چاہیے گاڑی کراچی کتنے دن میں پہنچے گی" | کرولا, کراچی |
| `en-quiet.wav`, `ur-quiet.wav` | The same clips at -30 dB, 48 kHz stereo PCM, played through the laptop speakers for the system-audio tests | as above |

| `en-soft.mp3`, `ur-soft.mp3` | -20 dB (mean about -41 dB) | loudness tests |
| `en-vsoft.mp3`, `ur-vsoft.mp3` | -32 dB (mean about -53 dB) | diagnostics |
| `en-loud.mp3`, `ur-loud.mp3` | +12 dB through a limiter (clipped, mean about -12 dB) | loudness tests |
| `en-fast.mp3`, `ur-fast.mp3` | 1.35× speed (`atempo=1.35`) | diagnostics (test-log Finding 8) |
| `en-twice.mp3` | en.mp3, then 1 s of silence, then en.mp3 again | diagnostics: two sentences in one session |

The quiet copies were made with:

```text
ffmpeg -i en.mp3 -filter:a volume=-30dB -ar 48000 -ac 2 en-quiet.wav
ffmpeg -i ur.mp3 -filter:a volume=-30dB -ar 48000 -ac 2 ur-quiet.wav
```
