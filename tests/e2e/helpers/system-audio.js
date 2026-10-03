// Plays a WAV file through the laptop's default sound device from a separate process,
// standing in for the WhatsApp Desktop app or an installed dialer (research.md R9).
import { spawn } from 'node:child_process';
import path from 'node:path';

function run(shell, command) {
  return new Promise((resolve) => {
    const p = spawn(shell, ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'ignore' });
    p.on('error', () => resolve(false));
    p.on('exit', (code) => resolve(code === 0));
  });
}

export async function playThroughSpeakers(wavPath) {
  const abs = path.resolve(wavPath).replace(/'/g, "''");
  const command = `(New-Object System.Media.SoundPlayer '${abs}').PlaySync()`;
  if (await run('pwsh', command)) return;
  if (await run('powershell.exe', command)) return;
  throw new Error(`Could not play ${wavPath} through the speakers (pwsh and powershell.exe both failed)`);
}
