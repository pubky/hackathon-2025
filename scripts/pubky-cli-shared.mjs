#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

export const STAGING_HOMESERVER_URL = 'https://homeserver.staging.pubky.app';
export const STAGING_HOMESERVER_PUBLIC_KEY = 'ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy';

export const COMMON_NESTED_KEYS = [
  'auth',
  'authentication',
  'authenticator',
  'account',
  'accounts',
  'identity',
  'identities',
  'session',
  'sessions',
  'users'
];

const isObject = (value) => typeof value === 'object' && value !== null;

export const parseFlags = (argv) => {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith('-') || value === '-') {
      positionals.push(value);
      continue;
    }
    if (value === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (value.startsWith('--')) {
      const [rawKey, rawValue] = value.slice(2).split('=', 2);
      if (!rawKey) continue;
      const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (rawValue !== undefined) {
        flags[key] = rawValue;
        continue;
      }
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }
    const key = value.replace(/^-+/, '');
    if (key.length === 0) continue;
    flags[key] = true;
  }
  return { flags, positionals };
};

export const resolveHomeserverConfig = ({
  homeserverPublicKey,
  homeserverUrl,
  testnet
} = {}) => {
  const resolvedPublicKey =
    homeserverPublicKey || process.env.PUBKY_HOMESERVER_PUBLIC_KEY || STAGING_HOMESERVER_PUBLIC_KEY;
  const resolvedUrl =
    homeserverUrl || process.env.PUBKY_HOMESERVER_URL || (!testnet ? STAGING_HOMESERVER_URL : undefined);
  return { homeserverPublicKey: resolvedPublicKey, homeserverUrl: resolvedUrl };
};

export const loadPubkySdk = async ({ testnet, homeserverPublicKey, homeserverUrl } = {}) => {
  let mod;
  try {
    mod = await import('@synonymdev/pubky');
  } catch (error) {
    throw new Error(
      'Unable to load @synonymdev/pubky. Please ensure dependencies are installed before running this command.'
    );
  }

  const candidateInstances = [];

  const withFactoryArgs = (factory) => {
    const args = {};
    if (homeserverPublicKey) args.homeserverPublicKey = homeserverPublicKey;
    if (homeserverUrl) args.homeserverUrl = homeserverUrl;
    return factory(args);
  };

  if (testnet) {
    if (typeof mod.testnet === 'function') {
      candidateInstances.push(() => mod.testnet());
    }
    if (mod?.Pubky?.testnet) {
      candidateInstances.push(() => mod.Pubky.testnet());
    }
  }

  if (mod?.Pubky?.fromHomeserver) {
    candidateInstances.push(() => withFactoryArgs(mod.Pubky.fromHomeserver));
  }
  if (typeof mod.fromHomeserver === 'function') {
    candidateInstances.push(() => withFactoryArgs(mod.fromHomeserver));
  }
  if (typeof mod.default === 'function') {
    candidateInstances.push(() => withFactoryArgs(mod.default));
  }
  if (mod?.Pubky) {
    candidateInstances.push(() => mod.Pubky);
  }
  candidateInstances.push(() => mod);

  const errors = [];
  for (const factory of candidateInstances) {
    try {
      const instance = await factory();
      if (instance) return instance;
    } catch (error) {
      errors.push(error);
    }
  }
  const error = new Error('Failed to instantiate Pubky SDK. Tried multiple factory methods.');
  error.cause = errors;
  throw error;
};

export const promptHidden = (query) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    const originalWrite = rl._writeToOutput;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        const mask = '*'.repeat(rl.line.length);
        rl.output.write(`\x1B[2K\x1B[200D${query}${mask}`);
      } else {
        originalWrite.call(rl, stringToWrite);
      }
    };

    rl.stdoutMuted = true;
    rl.question(query, (answer) => {
      rl.close();
      rl.stdoutMuted = false;
      rl.output.write('\n');
      resolve(answer.trim());
    });
  });

export const readRecoveryFile = async (recoveryPath) => {
  if (!recoveryPath) {
    throw new Error('Recovery file path is required.');
  }
  const resolvedPath = path.resolve(process.cwd(), recoveryPath);
  const bytes = await fs.readFile(resolvedPath);
  let parsed = null;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    parsed = null;
  }
  return { bytes, parsed, path: resolvedPath };
};

export const resolveMethod = (source, names, visited = new Set()) => {
  if (!isObject(source) || visited.has(source)) return null;
  visited.add(source);
  for (const name of names) {
    if (typeof source[name] === 'function') {
      return source[name].bind(source);
    }
  }

  for (const key of COMMON_NESTED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const nested = source[key];
    if (!isObject(nested)) continue;
    const candidate = resolveMethod(nested, names, visited);
    if (candidate) return candidate;
  }

  for (const value of Object.values(source)) {
    if (!isObject(value)) continue;
    const candidate = resolveMethod(value, names, visited);
    if (candidate) return candidate;
  }

  return null;
};

export const callWithFallbacks = async (method, payload, variations) => {
  const errors = [];
  for (const variation of variations) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await method(...variation(payload));
      return result;
    } catch (error) {
      errors.push(error);
    }
  }
  const error = new Error('All Pubky SDK invocation patterns failed.');
  error.cause = errors;
  throw error;
};

export const withSignup = async (sdk, payload) => {
  const signupMethod = resolveMethod(sdk, [
    'signupWithRecovery',
    'signupFromRecovery',
    'signup',
    'registerWithRecovery',
    'register',
    'createAccountWithRecovery',
    'createAccount',
    'createUser',
    'createUserWithRecovery'
  ]);

  if (!signupMethod) {
    throw new Error('Unable to find a signup method on the Pubky SDK.');
  }

  const variations = [
    (data) => [data],
    (data) => [{ ...data }],
    (data) => [data.bytes, data.passphrase, data.invitationCode],
    (data) => [data.bytes, data.passphrase],
    (data) => [data.parsed ?? data.bytes, data.passphrase, data.invitationCode],
    (data) => [
      {
        recoveryFile: data.bytes,
        recoveryDocument: data.bytes,
        recoveryData: data.bytes,
        recovery: data.bytes,
        recoveryPath: data.path,
        invitationCode: data.invitationCode,
        passphrase: data.passphrase,
        homeserverPublicKey: data.homeserverPublicKey,
        homeserverUrl: data.homeserverUrl,
        testnet: data.testnet
      }
    ]
  ];

  return callWithFallbacks(signupMethod, payload, variations);
};

export const approveAuthUrl = async (sdk, payload) => {
  const approveMethod = resolveMethod(sdk, [
    'approveAuthUrl',
    'approveAuthURL',
    'approveAuth',
    'approveAuthenticatorRequest',
    'approveAuthentication',
    'approvePubkyAuth',
    'approvePubkyAuthUrl',
    'approvePubkyAuthURL',
    'authorizeAuthUrl',
    'authorizeAuthURL'
  ]);

  if (!approveMethod) {
    throw new Error('Unable to locate an Auth URL approval method on the Pubky SDK.');
  }

  const variations = [
    (data) => [data],
    (data) => [{ ...data }],
    (data) => [data.authUrl, data],
    (data) => [data.authUrl, data.bytes, data.passphrase],
    (data) => [data.authUrl, data.bytes, data.passphrase, data.options],
    (data) => [
      {
        authUrl: data.authUrl,
        recoveryFile: data.bytes,
        recoveryDocument: data.bytes,
        recoveryData: data.bytes,
        recovery: data.bytes,
        passphrase: data.passphrase,
        homeserverPublicKey: data.homeserverPublicKey,
        homeserverUrl: data.homeserverUrl,
        testnet: data.testnet
      }
    ]
  ];

  return callWithFallbacks(approveMethod, payload, variations);
};

export const formatSdkError = (error) => {
  if (!error) return 'Unknown error';
  if (error instanceof AggregateError && Array.isArray(error.errors)) {
    return error.errors.map((entry) => String(entry?.message ?? entry)).join('\n');
  }
  if (Array.isArray(error?.cause)) {
    return error.cause.map((entry) => String(entry?.message ?? entry)).join('\n');
  }
  return error.message ?? String(error);
};
