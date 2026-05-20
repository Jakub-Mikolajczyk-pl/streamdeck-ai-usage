// Test render — writes PNGs to disk for visual inspection
import { writeFileSync } from 'fs';
import { renderButton } from './com.kupciu.ai-usage.sdPlugin/bin/render/button-canvas.js';

const snapshots = [
  {
    provider: 'Claude',
    session: { usedPercent: 1.0, resetsAt: Math.floor(Date.now()/1000) + 3*3600 + 24*60, windowLabel: '5h' },
    weekly:  { usedPercent: 0.72, resetsAt: Math.floor(Date.now()/1000) + 5*24*3600, windowLabel: '7d' },
    fetchedAt: Date.now(),
  },
  {
    provider: 'Codex',
    session: { usedPercent: 0.34, resetsAt: Math.floor(Date.now()/1000) + 1*3600 + 45*60, windowLabel: '5h' },
    weekly:  { usedPercent: 0.05, resetsAt: Math.floor(Date.now()/1000) + 6*24*3600, windowLabel: '7d' },
    fetchedAt: Date.now() - 7 * 60 * 1000, // 7min ago => shows stale
  },
  {
    provider: 'Claude',
    session: { usedPercent: 0.6, resetsAt: Math.floor(Date.now()/1000) + 2*3600, windowLabel: '5h' },
    weekly:  { usedPercent: 0.6, resetsAt: 0, windowLabel: '7d' },
    fetchedAt: Date.now(),
    error: 'No JSONL files found',
  },
];

for (const [i, snap] of snapshots.entries()) {
  const b64 = renderButton(snap, 'session');
  writeFileSync(`test-render-${i}.png`, Buffer.from(b64, 'base64'));
  console.log(`Wrote test-render-${i}.png`);
}
console.log('Open the PNG files to verify render output.');
