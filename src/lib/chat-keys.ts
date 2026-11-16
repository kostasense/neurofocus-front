import { chatApi } from "@/api/chat";
import {
    fromB64,
    newChannelKey,
    openChannelKey,
    sealChannelKey,
} from "@/lib/e2ee";
import type { ChatChannel } from "@/types/api";

export type Me = { id: number; priv: Uint8Array; pub: Uint8Array };

export type ChannelKeys = {
  /** Claves de canal que pude abrir, por versión. */
  keys: Map<number, Uint8Array>;
  /** Última versión completa (ambos tienen sobre) y que sé abrir; la que se usa para enviar. */
  usable: number | null;
  /** Mayor versión registrada a mi nombre (se use o no). */
  highest: number;
  /** Hay sobres míos que no pude abrir (cambié de identidad) o versiones a medio crear. */
  unreadable: number[];
  incomplete: number[];
};

const status = (e: any): number | undefined => e?.response?.status;

/** Pública del otro participante, o lanza un mensaje legible si aún no activa su cifrado. */
async function peerPublic(channel: ChatChannel) {
  try {
    const r = await chatApi.peerIdentity(channel.id_canal);
    return { id: r.idUsuario, pub: fromB64(r.clavePublica) };
  } catch (e: any) {
    if (status(e) === 404)
      throw new Error(
        "La otra persona todavía no activa el cifrado del chat. Se completará cuando abra su chat.",
      );
    throw e;
  }
}

/**
 * Registra los dos sobres de la versión `version`. Orden fijo (primero el del
 * psicólogo): si dos personas crean a la vez, solo una gana el primer registro
 * (409 para la otra) y ninguna termina con una K distinta.
 * Devuelve false si otra persona ya había creado esa versión.
 */
export async function createChannelKey(
  channel: ChatChannel,
  me: Me,
  version: number,
): Promise<boolean> {
  const peer = await peerPublic(channel);
  const canal = String(channel.id_canal);
  const K = newChannelKey();
  const targets = [
    { id: channel.id_psicologo, pub: null as Uint8Array | null },
    { id: channel.id_paciente, pub: null as Uint8Array | null },
  ].map((t) => ({ ...t, pub: t.id === me.id ? me.pub : peer.pub }));

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    try {
      await chatApi.registerKey(channel.id_canal, {
        sobreClaveCifrado: sealChannelKey({
          channelKey: K,
          myPriv: me.priv,
          targetPub: t.pub!,
          targetId: t.id,
          canal,
          version,
        }),
        versionClave: version,
        idUsuario: t.id,
      });
    } catch (e: any) {
      if (status(e) === 409 && i === 0) return false; // otra persona la creó primero
      throw e;
    }
  }
  return true;
}

/**
 * Lee mis sobres, abre los que puedo y completa lo que falte:
 *  - sin ningún sobre → crea la versión 1;
 *  - versión a medio crear y soy quien puede abrirla → entrega el sobre faltante.
 */
export async function loadChannelKeys(
  channel: ChatChannel,
  me: Me,
): Promise<ChannelKeys> {
  const canal = String(channel.id_canal);
  let envs = await chatApi.keys(channel.id_canal);

  if (envs.length === 0) {
    await createChannelKey(channel, me, 1);
    envs = await chatApi.keys(channel.id_canal);
  }

  const keys = new Map<number, Uint8Array>();
  const unreadable: number[] = [];
  const incomplete: number[] = [];
  let usable: number | null = null;

  for (const e of envs) {
    let opened: { channelKey: Uint8Array } | null = null;
    try {
      opened = openChannelKey({
        envelopeB64: e.sobreClaveCifrado,
        myPriv: me.priv,
        myId: me.id,
        canal,
        version: e.versionClave,
      });
    } catch {
      unreadable.push(e.versionClave);
      continue;
    }
    keys.set(e.versionClave, opened.channelKey);

    if (e.completa) {
      usable = e.versionClave;
      continue;
    }
    incomplete.push(e.versionClave);

    // Versión a medio crear: entrego el sobre del otro con la K que ya conozco.
    try {
      const peer = await peerPublic(channel);
      await chatApi.registerKey(channel.id_canal, {
        sobreClaveCifrado: sealChannelKey({
          channelKey: opened.channelKey,
          myPriv: me.priv,
          targetPub: peer.pub,
          targetId: peer.id,
          canal,
          version: e.versionClave,
        }),
        versionClave: e.versionClave,
        idUsuario: peer.id,
      });
      usable = e.versionClave;
      incomplete.pop();
    } catch {
      /* el otro la completará o lo reintentamos en el siguiente ciclo */
    }
  }

  return {
    keys,
    usable,
    highest: envs.reduce((n, e) => Math.max(n, e.versionClave), 0),
    unreadable,
    incomplete,
  };
}

/** Nueva versión de clave (cuando mis sobres anteriores ya no se pueden abrir). */
export async function renewChannelKey(
  channel: ChatChannel,
  me: Me,
  highest: number,
) {
  for (let v = highest + 1; v <= highest + 3; v++) {
    if (await createChannelKey(channel, me, v)) return v;
  }
  throw new Error("No se pudo renovar la clave, intenta de nuevo.");
}
