// Quick smoke test — run with: node test-providers.mjs
import { getClaudeUsage } from './com.kupciu.ai-usage.sdPlugin/bin/providers/claude-provider.js';
import { getCodexUsage } from './com.kupciu.ai-usage.sdPlugin/bin/providers/codex-provider.js';

const defaultSettings = {
  displayWindow: 'session',
  claudeTurnLimit: 45,
  claudeWeeklyLimit: 200,
  refreshInterval: 60,
};

console.log('=== Testing Claude provider ===');
const claude = await getClaudeUsage(defaultSettings);
console.log(JSON.stringify(claude, null, 2));

console.log('\n=== Testing Codex provider ===');
const codex = await getCodexUsage(defaultSettings);
console.log(JSON.stringify(codex, null, 2));
