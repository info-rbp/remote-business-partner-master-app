#!/usr/bin/env node

const CONFIRMATION_PHRASE = 'DEPLOY TO PROD';

if (process.env.ALLOW_PROD_DEPLOY === 'true') {
  console.log('ALLOW_PROD_DEPLOY is set. Skipping interactive confirmation.');
  process.exit(0);
}

const readline = require('readline');

console.log('⚠️  You are about to deploy to the production Firebase project.');
console.log('This action is irreversible and should only be done intentionally.');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question(`Type "${CONFIRMATION_PHRASE}" to continue: `, (answer) => {
  rl.close();
  if (answer.trim() === CONFIRMATION_PHRASE) {
    console.log('Confirmation phrase accepted. Proceeding with production deploy.');
    process.exit(0);
  }

  console.error('Aborting deploy: confirmation phrase did not match.');
  process.exit(1);
});
