#!/usr/bin/env node

import { existsSync, readFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── CLI args ────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    'port': { type: 'string', short: 'p', default: '4000' },
    'gateway': { type: 'string', short: 'g' },
    'workspace': { type: 'string', short: 'w' },
    'dev': { type: 'boolean', default: false },
    'no-open': { type: 'boolean', default: false },
    'help': { type: 'boolean', short: 'h', default: false }
  },
  strict: false
});

if (args.help) {
  console.log(`
  🦅 HawkBot Mission Control

  Usage: hawkbot-mission-control [options]

  Options:
    -p, --port <number>       Port to listen on (default: 4000)
    -g, --gateway <url>       OpenClaw gateway WebSocket URL
    -w, --workspace <path>    OpenClaw workspace directory
        --dev                 Run in development mode (nuxt dev)
        --no-open             Don't open browser automatically
    -h, --help                Show this help message
  `);
  process.exit(0);
}

// ── Node.js version check ───────────────────────────────────────────────────

const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);
if (nodeVersion < 24) {
  console.error(`\n  ❌ Node.js >= 24 is required (you have v${process.versions.node})\n`);
  process.exit(1);
}

// ── Auto-detect OpenClaw config ─────────────────────────────────────────────

let gatewayUrl = args.gateway;
let gatewayToken = '';
let workspacePath = args.workspace;

const openclawConfigPath = resolve(process.env.HOME || '~', '.openclaw/openclaw.json');

if (existsSync(openclawConfigPath)) {
  try {
    const config = JSON.parse(readFileSync(openclawConfigPath, 'utf-8'));
    const port = config.gateway?.port || 18789;

    if (!gatewayUrl) {
      gatewayUrl = `ws://127.0.0.1:${port}`;
    }

    if (config.gateway?.auth?.token) {
      gatewayToken = config.gateway.auth.token;
    }

    if (!workspacePath && config.agents?.defaults?.workspace) {
      workspacePath = config.agents.defaults.workspace;
    }

    console.log('  ✔ OpenClaw config detected at', openclawConfigPath);
  } catch {
    console.warn('  ⚠ Could not parse', openclawConfigPath);
  }
} else {
  console.log('  ⚠ OpenClaw config not found at', openclawConfigPath);
}

// Apply defaults
gatewayUrl = gatewayUrl || 'ws://127.0.0.1:18789';
workspacePath = workspacePath || resolve(process.env.HOME || '~', '.openclaw/workspace');

// ── Ensure .env exists ──────────────────────────────────────────────────────

const envPath = resolve(ROOT, '.env');
const envExamplePath = resolve(ROOT, '.env.example');

if (!existsSync(envPath) && existsSync(envExamplePath)) {
  copyFileSync(envExamplePath, envPath);
  console.log('  ✔ Created .env from .env.example');
}

// ── Check for production build ──────────────────────────────────────────────

const outputDir = resolve(ROOT, '.output/server/index.mjs');
if (!args.dev && !existsSync(outputDir)) {
  console.log('\n  📦 No production build found. Building...\n');
  try {
    execSync('npx nuxt build', { cwd: ROOT, stdio: 'inherit' });
  } catch {
    console.error('\n  ❌ Build failed. Try running with --dev flag instead.\n');
    process.exit(1);
  }
}

// ── Start server ────────────────────────────────────────────────────────────

const port = args.port || '4000';

console.log(`
  🦅 HawkBot Mission Control

  ➜ Gateway:   ${gatewayUrl}
  ➜ Workspace: ${workspacePath}
  ➜ Port:      ${port}
  ➜ Mode:      ${args.dev ? 'development' : 'production'}
`);

const env = {
  ...process.env,
  OPENCLAW_GATEWAY_URL: gatewayUrl,
  OPENCLAW_GATEWAY_TOKEN: gatewayToken,
  WORKSPACE_PATH: workspacePath,
  PORT: port,
  NUXT_PORT: port
};

if (args.dev) {
  const child = spawn('npx', ['nuxt', 'dev', '--port', port], {
    cwd: ROOT,
    stdio: 'inherit',
    env
  });
  child.on('close', code => process.exit(code ?? 0));
} else {
  const child = spawn('node', [resolve(ROOT, '.output/server/index.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
    env
  });
  child.on('close', code => process.exit(code ?? 0));
}

// ── Open browser ────────────────────────────────────────────────────────────

if (!args['no-open']) {
  setTimeout(() => {
    const url = `http://localhost:${port}`;
    const platform = process.platform;
    try {
      if (platform === 'darwin') execSync(`open ${url}`);
      else if (platform === 'linux') execSync(`xdg-open ${url}`);
      else if (platform === 'win32') execSync(`start ${url}`);
    } catch {
      // Silently fail — user can open manually
    }
  }, 2000);
}
