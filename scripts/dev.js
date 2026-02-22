#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const portFile = path.join(rootDir, '.mockapi-port');
const timeoutMs = 15000;
const pollIntervalMs = 100;

const server = spawn('node', ['packages/server/test-server.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

function waitForPortFile() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const t = setInterval(() => {
      if (Date.now() > deadline) {
        clearInterval(t);
        reject(new Error('Timeout waiting for server to bind a port'));
        return;
      }
      try {
        if (fs.existsSync(portFile)) {
          clearInterval(t);
          const port = fs.readFileSync(portFile, 'utf-8').trim();
          resolve(port);
        }
      } catch (_) {
        // ignore read errors, keep polling
      }
    }, pollIntervalMs);
  });
}

let uiProcess = null;

waitForPortFile()
  .then((port) => {
    uiProcess = spawn('npm', ['run', 'dev', '--workspace=packages/ui'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, MOCKAPI_PORT: port, VITE_MOCKAPI_PORT: port },
    });
  })
  .catch((err) => {
    console.error(err.message);
    server.kill();
    process.exit(1);
  });

function killAll() {
  if (server) server.kill();
  if (uiProcess) uiProcess.kill();
  try {
    if (fs.existsSync(portFile)) fs.unlinkSync(portFile);
  } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);
