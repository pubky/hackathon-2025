#!/usr/bin/env node
import {
  formatSdkError,
  loadPubkySdk,
  parseFlags,
  promptHidden,
  readRecoveryFile,
  resolveHomeserverConfig,
  withSignup
} from './pubky-cli-shared.mjs';

const helpMessage = `Usage: npm run signup -- <homeserver_pubky> <recovery_file> [invitation_code] [--testnet] [--homeserver-url <url>]

Examples:
  npm run signup -- 8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo ./alice.recovery INVITE-123
  npm run signup -- 8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo ./alice.recovery --testnet
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

  const [homeserverPublicKey, recoveryFile, maybeInvitation] = positionals;
  const invitationCode = positionals.length >= 3 ? maybeInvitation : undefined;
  const testnet = Boolean(flags.testnet || flags.t);
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

  try {
    await withSignup(sdk, {
      bytes,
      parsed,
      path,
      passphrase,
      invitationCode,
      homeserverPublicKey: resolvedPublicKey,
      homeserverUrl: resolvedUrl,
      testnet
    });
  } catch (error) {
    const formatted = formatSdkError(error);
    throw new Error(`Signup failed. ${formatted}`);
  }

  console.log('Signup completed successfully.');
};

main().catch((error) => {
  console.error(error.message ?? error);
  if (error?.cause) {
    console.error(error.cause);
  }
  process.exitCode = 1;
});
