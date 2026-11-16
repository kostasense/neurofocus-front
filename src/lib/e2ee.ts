/**
 * Cifrado de extremo a extremo del chat. Todo ocurre en el dispositivo.
 *
 *  - Identidad:  par X25519 por usuario. La privada nunca sale del dispositivo
 *                sin cifrar; la pública se publica en el servidor.
 *  - Clave de canal (K): 32 bytes aleatorios por canal y versión (AES-256-GCM).
 *  - Sobre:      K cifrada para cada participante con una clave derivada por
 *                ECDH (X25519) + HKDF-SHA256. Es lo que guarda
 *                ClavesCanalParticipante.sobre_clave_cifrado.
 *  - Mensaje:    AES-256-GCM con K, nonce de 12 bytes aleatorio y datos
 *                autenticados (canal, emisor, versión, tipo).
 *  - Respaldo:   la privada, cifrada con una clave derivada de una frase
 *                (scrypt), para recuperarla en otro dispositivo.
 */
import { gcm } from "@noble/ciphers/aes";
import { x25519 } from "@noble/curves/ed25519";
import { hkdf } from "@noble/hashes/hkdf";
import { scryptAsync } from "@noble/hashes/scrypt";
import { sha256 } from "@noble/hashes/sha256";

const FORMAT = 1;
const enc = new TextEncoder();
const dec = new TextDecoder();

/* ---------------------------- utilidades ---------------------------- */
export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  const c = (globalThis as any).crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(out);
    return out;
  }
  // React Native (Hermes) no trae WebCrypto: expo-crypto usa el CSPRNG nativo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-crypto").getRandomBytes(n) as Uint8Array;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    s += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    s += b === undefined ? "=" : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    s += c === undefined ? "=" : B64[c & 63];
  }
  return s;
}
export function fromB64(str: string): Uint8Array {
  const clean = str.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map((k) =>
      i + k < clean.length ? B64.indexOf(clean[i + k]) : -1,
    );
    out[o++] = (n[0] << 2) | (n[1] >> 4);
    if (n[2] >= 0) out[o++] = ((n[1] & 15) << 4) | (n[2] >> 2);
    if (n[3] >= 0) out[o++] = ((n[2] & 3) << 6) | n[3];
  }
  return out.subarray(0, o);
}
const concat = (...p: Uint8Array[]) => {
  const out = new Uint8Array(p.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of p) {
    out.set(x, o);
    o += x.length;
  }
  return out;
};

/* ------------------------------ identidad ----------------------------- */
export type Identity = { priv: Uint8Array; pub: Uint8Array };

export function newIdentity(): Identity {
  const priv = randomBytes(32);
  return { priv, pub: x25519.getPublicKey(priv) };
}
export const publicFrom = (priv: Uint8Array) => x25519.getPublicKey(priv);

/* ------------------- respaldo de la privada con frase ------------------- */
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, dkLen: 32, asyncTick: 20 };

async function passKey(pass: string, salt: Uint8Array) {
  return scryptAsync(enc.encode(pass.normalize("NFKC")), salt, SCRYPT);
}

/** Formato: [1][salt 16][nonce 12][privada cifrada + etiqueta 48] */
export async function wrapPrivateKey(
  priv: Uint8Array,
  pass: string,
  userId: number,
): Promise<string> {
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const key = await passKey(pass, salt);
  const ct = gcm(key, nonce, enc.encode(`nf1-backup|${userId}`)).encrypt(priv);
  return toB64(concat(Uint8Array.of(FORMAT), salt, nonce, ct));
}

/** Lanza si la frase es incorrecta (la etiqueta GCM no valida). */
export async function unwrapPrivateKey(
  backupB64: string,
  pass: string,
  userId: number,
): Promise<Uint8Array> {
  const raw = fromB64(backupB64);
  if (raw[0] !== FORMAT || raw.length < 1 + 16 + 12 + 48)
    throw new Error("Respaldo con formato desconocido");
  const salt = raw.subarray(1, 17);
  const nonce = raw.subarray(17, 29);
  const ct = raw.subarray(29);
  const key = await passKey(pass, salt);
  try {
    return gcm(key, nonce, enc.encode(`nf1-backup|${userId}`)).decrypt(ct);
  } catch {
    throw new Error("Frase incorrecta");
  }
}

/* --------------------------- sobre de clave --------------------------- */
const kek = (priv: Uint8Array, pub: Uint8Array, canal: string, ver: number) =>
  hkdf(
    sha256,
    x25519.getSharedSecret(priv, pub),
    undefined,
    enc.encode(`nf1-kek|${canal}|${ver}`),
    32,
  );

export const newChannelKey = () => randomBytes(32);

/** Formato: [1][pública del que sella 32][nonce 12][K cifrada + etiqueta 48] */
export function sealChannelKey(p: {
  channelKey: Uint8Array;
  myPriv: Uint8Array;
  targetPub: Uint8Array;
  targetId: number;
  canal: string;
  version: number;
}): string {
  const myPub = x25519.getPublicKey(p.myPriv);
  const nonce = randomBytes(12);
  const aad = enc.encode(`nf1-env|${p.canal}|${p.version}|${p.targetId}`);
  const ct = gcm(
    kek(p.myPriv, p.targetPub, p.canal, p.version),
    nonce,
    aad,
  ).encrypt(p.channelKey);
  return toB64(concat(Uint8Array.of(FORMAT), myPub, nonce, ct));
}

/** Devuelve K y la pública de quien selló el sobre. Lanza si no se puede abrir. */
export function openChannelKey(p: {
  envelopeB64: string;
  myPriv: Uint8Array;
  myId: number;
  canal: string;
  version: number;
}): { channelKey: Uint8Array; sealedBy: Uint8Array } {
  const raw = fromB64(p.envelopeB64);
  if (raw[0] !== FORMAT || raw.length !== 1 + 32 + 12 + 48)
    throw new Error("Sobre con formato desconocido");
  const sealedBy = raw.slice(1, 33);
  const nonce = raw.subarray(33, 45);
  const ct = raw.subarray(45);
  const aad = enc.encode(`nf1-env|${p.canal}|${p.version}|${p.myId}`);
  try {
    const channelKey = gcm(
      kek(p.myPriv, sealedBy, p.canal, p.version),
      nonce,
      aad,
    ).decrypt(ct);
    return { channelKey, sealedBy };
  } catch {
    throw new Error("No se pudo abrir el sobre de clave");
  }
}

/* ------------------------------ mensajes ------------------------------ */
export type MsgCtx = {
  canal: string;
  emisor: number;
  version: number;
  tipo: number;
};
const msgAad = (c: MsgCtx) =>
  enc.encode(`nf1-msg|${c.canal}|${c.emisor}|${c.version}|${c.tipo}`);

export type EncryptedPayload = {
  mensajeCifrado: string;
  nonce: string;
  etiquetaAutenticacion: string;
  versionClave: number;
};

export function encryptText(
  channelKey: Uint8Array,
  text: string,
  ctx: MsgCtx,
): EncryptedPayload {
  const nonce = randomBytes(12);
  const out = gcm(channelKey, nonce, msgAad(ctx)).encrypt(
    enc.encode(JSON.stringify({ v: 1, t: text })),
  );
  const tag = out.slice(out.length - 16);
  const body = out.slice(0, out.length - 16);
  return {
    mensajeCifrado: toB64(body),
    nonce: toB64(nonce),
    etiquetaAutenticacion: toB64(tag),
    versionClave: ctx.version,
  };
}

/** Devuelve el texto o null si no valida (clave equivocada o dato alterado). */
export function decryptText(
  channelKey: Uint8Array,
  m: { mensajeCifrado: string; nonce: string; etiquetaAutenticacion: string },
  ctx: MsgCtx,
): string | null {
  try {
    const plain = gcm(channelKey, fromB64(m.nonce), msgAad(ctx)).decrypt(
      concat(fromB64(m.mensajeCifrado), fromB64(m.etiquetaAutenticacion)),
    );
    const obj = JSON.parse(dec.decode(plain));
    return typeof obj?.t === "string" ? obj.t : null;
  } catch {
    return null;
  }
}

/** Código de seguridad: igual en ambos lados si las claves públicas son las mismas. */
export function securityCode(a: Uint8Array, b: Uint8Array): string {
  const [x, y] = toB64(a) < toB64(b) ? [a, b] : [b, a];
  const hex = Array.from(sha256(concat(x, y)).slice(0, 12))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return hex.match(/.{4}/g)!.join(" ");
}
