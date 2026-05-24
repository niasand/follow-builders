#!/usr/bin/env node

// ============================================================================
// Follow Builders — Prepare Digest
// ============================================================================
// Reads config, source list, and prompts. Outputs JSON for the agent.
// The agent then fetches X content directly using OpenClaw/browser.
//
// Usage: node prepare-digest.js
// Output: JSON to stdout
// ============================================================================

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const USER_DIR = join(homedir(), '.follow-builders');
const CONFIG_PATH = join(USER_DIR, 'config.json');

const scriptDir = decodeURIComponent(new URL('.', import.meta.url).pathname);
const SKILL_DIR = join(scriptDir, '..');
const SOURCES_PATH = join(SKILL_DIR, 'config', 'default-sources.json');

const PROMPT_FILES = [
  'summarize-tweets.md',
  'summarize-podcast.md',
  'summarize-blogs.md',
  'digest-intro.md',
  'translate.md'
];

async function main() {
  const errors = [];

  // 1. User config
  let config = { language: 'en', frequency: 'daily', delivery: { method: 'stdout' } };
  if (existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(await readFile(CONFIG_PATH, 'utf-8'));
    } catch (err) {
      errors.push(`Config error: ${err.message}`);
    }
  }

  // 2. Source list
  let sources = { x_accounts: [], podcasts: [], blogs: [] };
  try {
    sources = JSON.parse(await readFile(SOURCES_PATH, 'utf-8'));
  } catch (err) {
    errors.push(`Sources error: ${err.message}`);
  }

  // 3. Prompts: user custom > skill defaults
  const prompts = {};
  const localPromptsDir = join(SKILL_DIR, 'prompts');
  const userPromptsDir = join(USER_DIR, 'prompts');

  for (const filename of PROMPT_FILES) {
    const key = filename.replace('.md', '').replace(/-/g, '_');
    const userPath = join(userPromptsDir, filename);
    const localPath = join(localPromptsDir, filename);

    if (existsSync(userPath)) {
      prompts[key] = await readFile(userPath, 'utf-8');
    } else if (existsSync(localPath)) {
      prompts[key] = await readFile(localPath, 'utf-8');
    } else {
      errors.push(`Prompt not found: ${filename}`);
    }
  }

  // 4. Stats
  const xGroups = sources.x_groups || [];
  const totalXAccounts = xGroups.reduce((sum, g) => sum + (g.accounts?.length || 0), 0);

  // 5. Output
  console.log(JSON.stringify({
    status: 'ok',
    config: {
      language: config.language || 'en',
      frequency: config.frequency || 'daily',
      delivery: config.delivery || { method: 'stdout' }
    },
    sources,
    stats: {
      xGroups: xGroups.length,
      xAccounts: totalXAccounts,
      podcasts: sources.podcasts?.length || 0,
      blogs: sources.blogs?.length || 0
    },
    prompts,
    errors: errors.length > 0 ? errors : undefined
  }, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
});
