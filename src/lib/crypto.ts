/**
 * E2EE crypto utilities — ECDH key exchange + AES-GCM encryption.
 * All operations run client-side using Web Crypto API.
 */

const ALGO_ECDH = "ECDH";
const ALGO_AES = "AES-GCM";
const CurveName = "P-256";

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
}

/**
 * Generate an ECDH key pair for key exchange.
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: ALGO_ECDH, namedCurve: CurveName },
    true, // extractable
    ["deriveKey", "deriveBits"],
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeyJwk,
  };
}

/**
 * Derive a shared AES-GCM key from our private key + their public key.
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  theirPublicKeyJwk: JsonWebKey,
): Promise<CryptoKey> {
  const theirPublicKey = await crypto.subtle.importKey(
    "jwk",
    theirPublicKeyJwk,
    { name: ALGO_ECDH, namedCurve: CurveName },
    false,
    [],
  );

  return crypto.subtle.deriveKey(
    { name: ALGO_ECDH, public: theirPublicKey },
    privateKey,
    { name: ALGO_AES, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a string with AES-GCM.
 * Returns base64-encoded ciphertext with IV prefix.
 */
export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO_AES, iv },
    sharedKey,
    encoded,
  );

  // Prepend IV to ciphertext: iv(12) + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded ciphertext with AES-GCM.
 */
export async function decryptMessage(
  encryptedBase64: string,
  sharedKey: CryptoKey,
): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGO_AES, iv },
    sharedKey,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Export a CryptoKey to JWK format for storage/transmission.
 */
export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

/**
 * Import a JWK public key for ECDH.
 */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: ALGO_ECDH, namedCurve: CurveName },
    false,
    [],
  );
}

/**
 * Import a JWK private key for ECDH.
 */
export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: ALGO_ECDH, namedCurve: CurveName },
    false,
    ["deriveKey", "deriveBits"],
  );
}
