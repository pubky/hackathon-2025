import sodium from 'libsodium-wrappers';

let isInitialized = false;

export async function ensureSodiumReady() {
  if (!isInitialized) {
    await sodium.ready;
    isInitialized = true;
  }
}

export function ed25519PublicKeyToX25519(ed25519PublicKey: Uint8Array): Uint8Array {
  return sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519PublicKey);
}

export function ed25519SecretKeyToX25519(ed25519SecretKey: Uint8Array): Uint8Array {
  return sodium.crypto_sign_ed25519_sk_to_curve25519(ed25519SecretKey);
}

export function z32ToPubkeyBytes(z32Pubkey: string): Uint8Array {
  try {
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
  } catch (error) {
    console.error('[Crypto] Failed to decode z32 pubkey:', error);
    throw new Error('Invalid pubky format. Expected z32-encoded public key.');
  }
}

export interface EncryptedMessage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

export async function encryptMessageForRecipient(
  plaintext: string,
  recipientPubkeyZ32: string
): Promise<EncryptedMessage> {
  await ensureSodiumReady();

  const recipientEd25519Pk = z32ToPubkeyBytes(recipientPubkeyZ32);
  const recipientX25519Pk = ed25519PublicKeyToX25519(recipientEd25519Pk);

  const messageBytes = sodium.from_string(plaintext);

  const ciphertext = sodium.crypto_box_seal(messageBytes, recipientX25519Pk);

  const nonce = new Uint8Array(24);

  return {
    ciphertext,
    nonce
  };
}

export async function decryptMessageForRecipient(
  _ciphertext: Uint8Array,
  _recipientPubkeyZ32: string
): Promise<string> {
  await ensureSodiumReady();

  throw new Error('Decryption requires access to private key from Pubky Ring. This will be implemented with Ring integration.');
}

export function bytesToBase64(bytes: Uint8Array): string {
  return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

export function base64ToBytes(base64: string): Uint8Array {
  return sodium.from_base64(base64, sodium.base64_variants.ORIGINAL);
}

export function validatePubkyFormat(pubkey: string): boolean {
  try {
    const cleaned = pubkey.replace(/^pubky:\/\//, '');

    if (cleaned.length < 40 || cleaned.length > 60) {
      return false;
    }

    const base32Alphabet = 'ybndrfg8ejkmcpqxot1uwisza345h769';
    for (const char of cleaned.toLowerCase()) {
      if (!base32Alphabet.includes(char)) {
        return false;
      }
    }

    z32ToPubkeyBytes(cleaned);
    return true;
  } catch {
    return false;
  }
}

export async function generateMockSignature(message: Uint8Array): Promise<Uint8Array> {
  await ensureSodiumReady();

  const mockSignature = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    mockSignature[i] = Math.floor(Math.random() * 256);
  }

  return mockSignature;
}
