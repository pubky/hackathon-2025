import { ensureSodiumReady } from './crypto';
import sodium from 'libsodium-wrappers';
import { CanonicalConsentObject, ConsentSession } from '../types';

export const CONSENT_STATEMENT_V1 =
  "We both agree to be intimate and respectful during this time window. Consent ends at the timer.";

export const CONSENT_VERSION = "1.0";

export async function generateStatementHash(statement: string): Promise<string> {
  await ensureSodiumReady();
  const bytes = sodium.from_string(statement);
  const hash = sodium.crypto_generichash(32, bytes);
  return sodium.to_hex(hash);
}

export function createCanonicalObject(
  sessionId: string,
  aPubky: string,
  bPubky: string,
  statementHash: string,
  windowStart: string,
  windowEnd: string
): CanonicalConsentObject {
  return {
    version: CONSENT_VERSION,
    session_id: sessionId,
    a_pubky: aPubky,
    b_pubky: bPubky,
    statement_hash: statementHash,
    window_start: windowStart,
    window_end: windowEnd
  };
}

export async function hashCanonicalObject(obj: CanonicalConsentObject): Promise<string> {
  await ensureSodiumReady();

  const canonicalString = JSON.stringify(obj, Object.keys(obj).sort());
  const bytes = sodium.from_string(canonicalString);
  const hash = sodium.crypto_generichash(32, bytes);

  return sodium.to_hex(hash);
}

export async function verifySignature(
  signature: string,
  canonicalHash: string,
  pubkey: string
): Promise<boolean> {
  await ensureSodiumReady();

  try {
    const signatureBytes = sodium.from_hex(signature);
    const messageBytes = sodium.from_hex(canonicalHash);
    const pubkeyBytes = z32ToBytes(pubkey);

    if (pubkeyBytes.length !== 32) {
      console.error('[Consent] Invalid pubkey length:', pubkeyBytes.length);
      return false;
    }

    if (signatureBytes.length !== 64) {
      console.error('[Consent] Invalid signature length:', signatureBytes.length);
      return false;
    }

    return sodium.crypto_sign_verify_detached(signatureBytes, messageBytes, pubkeyBytes);
  } catch (error) {
    console.error('[Consent] Signature verification error:', error);
    return false;
  }
}

function z32ToBytes(z32Pubkey: string): Uint8Array {
  const cleaned = z32Pubkey.replace(/^pubky:\/\//, '');
  const base32Alphabet = 'ybndrfg8ejkmcpqxot1uwisza345h769';
  const paddedZ32 = cleaned.padEnd(Math.ceil(cleaned.length / 8) * 8, '=');

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < paddedZ32.length; i++) {
    const char = paddedZ32[i];
    if (char === '=') break;

    const index = base32Alphabet.indexOf(char.toLowerCase());
    if (index === -1) {
      throw new Error(`Invalid z32 character: ${char}`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

export function calculateWindowTimes(durationMinutes: number): { start: string; end: string } {
  const now = new Date();
  const start = now.toISOString();
  const endDate = new Date(now.getTime() + durationMinutes * 60 * 1000);
  const end = endDate.toISOString();

  return { start, end };
}

export function getSessionStatus(session: ConsentSession): 'pending' | 'active' | 'expired' {
  const now = new Date();
  const windowEnd = new Date(session.window_end);

  if (now > windowEnd) {
    return 'expired';
  }

  if (!session.a_authentication || !session.b_authentication) {
    return 'pending';
  }

  return 'active';
}

export function isSessionExpired(session: ConsentSession): boolean {
  const now = new Date();
  const windowEnd = new Date(session.window_end);
  return now > windowEnd || session.status === 'expired';
}

export function getTimeRemaining(windowEnd: string): { minutes: number; seconds: number; total: number } {
  const now = new Date();
  const end = new Date(windowEnd);
  const totalSeconds = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));

  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    total: totalSeconds
  };
}

export function formatPubkyShort(pubkey: string): string {
  if (pubkey.length <= 16) return pubkey;
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function generateShortId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);

  for (let i = 0; i < 6; i++) {
    result += chars[array[i] % chars.length];
  }

  return result;
}
