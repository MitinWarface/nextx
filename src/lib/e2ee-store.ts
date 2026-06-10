/**
 * E2EE Store — manages encryption keys for secret chats.
 * Private keys stored in IndexedDB, shared keys derived and cached in memory.
 */
import {
  generateKeyPair,
  deriveSharedKey,
  exportKey,
  importPrivateKey,
  importPublicKey,
  encryptMessage,
  decryptMessage,
  type KeyPair,
} from "@/lib/crypto";

const DB_NAME = "nextx-e2ee";
const STORE_NAME = "keys";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(key: string): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbSet(key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

interface StoredKeys {
  privateKeyJwk: JsonWebKey;
  publicKeyJwk: JsonWebKey;
}

// In-memory cache of derived shared keys
const sharedKeyCache = new Map<string, CryptoKey>();

/**
 * Generate a new key pair for a secret chat and store in IndexedDB.
 * Returns the public key JWK to send to the server.
 */
export async function initSecretChatKeys(chatId: string): Promise<JsonWebKey> {
  const kp = await generateKeyPair();
  const privateKeyJwk = await exportKey(kp.privateKey);
  const publicKeyJwk = kp.publicKeyJwk;

  await dbSet(`chat:${chatId}`, { privateKeyJwk, publicKeyJwk } as StoredKeys);

  return publicKeyJwk;
}

/**
 * After receiving the peer's public key, derive and cache the shared key.
 */
export async function deriveAndCacheSharedKey(
  chatId: string,
  peerPublicKeyJwk: JsonWebKey,
): Promise<CryptoKey> {
  const stored = (await dbGet(`chat:${chatId}`)) as StoredKeys | undefined;
  if (!stored) throw new Error("no_keys_for_chat");

  const privateKey = await importPrivateKey(stored.privateKeyJwk);
  const sharedKey = await deriveSharedKey(privateKey, peerPublicKeyJwk);

  sharedKeyCache.set(chatId, sharedKey);
  return sharedKey;
}

/**
 * Get cached shared key for a chat.
 */
export function getSharedKey(chatId: string): CryptoKey | undefined {
  return sharedKeyCache.get(chatId);
}

/**
 * Check if we have a shared key for a chat.
 */
export function hasSharedKey(chatId: string): boolean {
  return sharedKeyCache.has(chatId);
}

/**
 * Encrypt a message for a secret chat.
 */
export async function encryptForChat(chatId: string, plaintext: string): Promise<string> {
  const key = sharedKeyCache.get(chatId);
  if (!key) throw new Error("no_shared_key");
  return encryptMessage(plaintext, key);
}

/**
 * Decrypt a message from a secret chat.
 */
export async function decryptFromChat(chatId: string, encrypted: string): Promise<string> {
  const key = sharedKeyCache.get(chatId);
  if (!key) throw new Error("no_shared_key");
  return decryptMessage(encrypted, key);
}

/**
 * Get our public key JWK for a chat (to send to peer).
 */
export async function getMyPublicKey(chatId: string): Promise<JsonWebKey | null> {
  const stored = (await dbGet(`chat:${chatId}`)) as StoredKeys | undefined;
  return stored?.publicKeyJwk ?? null;
}
