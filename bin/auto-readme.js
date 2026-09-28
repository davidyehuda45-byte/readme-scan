#!/usr/bin/env node

import { runCli } from '../src/cli.js';

runCli()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
