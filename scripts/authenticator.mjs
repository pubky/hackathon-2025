#!/usr/bin/env node
import {
  approveAuthUrl,
  formatSdkError,
  loadPubkySdk,
  parseFlags,
  promptHidden,
  readRecoveryFile,
  resolveHomeserverConfig,
  withSignup
} from './pubky-cli-shared.mjs';

const helpMessage = `Usage: npm run authenticator -- <recovery_file> "<AUTH_URL>" [--testnet] [--homeserver <public_key>] [--homeserver-url <url>]

Examples:
  npm run authenticator -- ./alice.recovery "pubkyauth:///?caps=/pub/my-app/:rw&secret=..." --homeserver ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy
  npm run authenticator -- ./alice.recovery "pubkyauth:///?caps=/pub/my-app/:rw&secret=..." --testnet
`;

const main = async () => {
  const argv = process.argv.slice(2);
  const { flags, positionals } = parseFlags(argv);

  if (flags.help || flags.h) {
    console.log(helpMessage);
    return;
  }

  if (positionals.length < 2) {
    console.error('Missing required arguments.');
    console.error(helpMessage);
    process.exitCode = 1;
    return;
  }

  const [recoveryFile, authUrl] = positionals;
  if (!authUrl?.startsWith('pubkyauth://')) {
    console.warn('Auth URL does not look like a pubkyauth:// URL. Continuing anyway.');
  }

  const testnet = Boolean(flags.testnet || flags.t);
  const homeserverPublicKey = flags.homeserver || flags.homeserverPublicKey;
  const homeserverUrl = flags.homeserverUrl;

  const { homeserverPublicKey: resolvedPublicKey, homeserverUrl: resolvedUrl } = resolveHomeserverConfig({
    homeserverPublicKey,
    homeserverUrl,
    testnet
  });

  const passphrase = await promptHidden('Recovery passphrase: ');
  if (!passphrase) {
    throw new Error('A passphrase is required to decrypt the recovery file.');
  }

  const { bytes, parsed, path } = await readRecoveryFile(recoveryFile);

  const sdk = await loadPubkySdk({
    testnet,
    homeserverPublicKey: resolvedPublicKey,
    homeserverUrl: resolvedUrl
  });

  if (testnet) {
    try {
      await withSignup(sdk, {
        bytes,
        parsed,
        path,
        passphrase,
        invitationCode: undefined,
        homeserverPublicKey: resolvedPublicKey,
        homeserverUrl: resolvedUrl,
        testnet
      });
      console.log('Testnet signup completed (or already existed).');
    } catch (error) {
      const message = formatSdkError(error);
      if (!/already exists|conflict|409/i.test(message)) {
        throw new Error(`Unable to ensure signup on testnet. ${message}`);
      }
      console.log('Signup skipped: account already exists.');
    }
  }

  try {
    await approveAuthUrl(sdk, {
      bytes,
      parsed,
      path,
      passphrase,
      authUrl,
      homeserverPublicKey: resolvedPublicKey,
      homeserverUrl: resolvedUrl,
      testnet
    });
  } catch (error) {
    const formatted = formatSdkError(error);
    throw new Error(`Auth URL approval failed. ${formatted}`);
  }

  console.log('Auth URL approved successfully.');
};

main().catch((error) => {
  console.error(error.message ?? error);
  if (error?.cause) {
    console.error(error.cause);
  }
  process.exitCode = 1;
});
