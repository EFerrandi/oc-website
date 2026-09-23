#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { hashPassword } from '../src/services/auth.js';

const rl = createInterface({ input: stdin, output: stdout });

const password = await rl.question('New admin password: ');
rl.close();

if (password.trim().length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

const hash = await hashPassword(password);

console.log('\nAdd this to your .env file:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
