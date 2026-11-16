import { apiClient, apiData } from "@/lib/api-client";
import { ChatChannel, ChatMessage, PanicAlert } from "@/types/api";

export type EncryptedBody = {
  mensajeCifrado: string;
  nonce: string;
  etiquetaAutenticacion: string;
  versionClave: number;
};

/** Sobre de clave del usuario; `completa` = ambos participantes ya tienen esa versión. */
export type KeyEnvelope = {
  versionClave: number;
  sobreClaveCifrado: string;
  fechaCreacion: string;
  completa: boolean;
};

export type MyIdentity = {
  clavePublica: string;
  respaldoClavePrivada: string;
  fechaActualizacion: string;
};

export const chatApi = {
  createChannel: (d: { idPaciente: number; idPsicologo: number }) =>
    apiData<ChatChannel>(apiClient.post("/chat/channels", d)),
  channels: () => apiData<ChatChannel[]>(apiClient.get("/chat/channels")),
  channel: (id: number | string) =>
    apiData<ChatChannel>(apiClient.get(`/chat/channels/${id}`)),
  enable: (id: number | string, v: boolean) =>
    apiData<ChatChannel>(apiClient.patch(`/chat/channels/${id}/enabled/${v}`)),
  close: (id: number | string) =>
    apiData<ChatChannel>(apiClient.patch(`/chat/channels/${id}/close`)),

  /* ---- identidad de cifrado (clave pública + respaldo de la privada) ---- */
  saveIdentity: (d: { clavePublica: string; respaldoClavePrivada: string }) =>
    apiData(apiClient.put("/chat/identity", d)),
  /** null si el usuario todavía no activa su cifrado (404). */
  myIdentity: async (): Promise<MyIdentity | null> => {
    try {
      return await apiData<MyIdentity>(apiClient.get("/chat/identity/me"));
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },
  peerIdentity: (id: number | string) =>
    apiData<{ idUsuario: number; clavePublica: string }>(
      apiClient.get(`/chat/channels/${id}/peer-identity`),
    ),

  /* ---- sobres de clave de canal ---- */
  keys: (id: number | string) =>
    apiData<KeyEnvelope[]>(apiClient.get(`/chat/channels/${id}/keys`)),
  registerKey: (
    id: number | string,
    d: { sobreClaveCifrado: string; versionClave: number; idUsuario?: number },
  ) => apiData(apiClient.post(`/chat/channels/${id}/keys`, d)),
  myKey: (id: number | string, v: number) =>
    apiData(apiClient.get(`/chat/channels/${id}/keys/${v}`)),

  /* ---- mensajes (siempre cifrados en el cliente) ---- */
  send: (id: number | string, d: EncryptedBody & { tipoMensaje: 1 | 2 }) =>
    apiData<{ idMensaje: string; fechaEnvio: string }>(
      apiClient.post(`/chat/channels/${id}/messages`, d),
    ),
  messages: (id: number | string, beforeId?: number | string, limit = 50) =>
    apiData<ChatMessage[]>(
      apiClient.get(`/chat/channels/${id}/messages`, {
        params: { beforeId, limit },
      }),
    ),
  delivered: (id: number | string) =>
    apiData(apiClient.patch(`/chat/messages/${id}/delivered`)),
  read: (id: number | string) =>
    apiData(apiClient.patch(`/chat/messages/${id}/read`)),
  hide: (id: number | string) =>
    apiData(apiClient.patch(`/chat/messages/${id}/hide`)),

  /* ---- pánico ---- */
  panic: (id: number | string, d: EncryptedBody) =>
    apiData<{ idAlerta: string; idMensaje: string; estado: number }>(
      apiClient.post(`/chat/channels/${id}/panic`, d),
    ),
  alerts: (estado?: number) =>
    apiData<PanicAlert[]>(
      apiClient.get("/chat/panic-alerts", { params: { estado } }),
    ),
  alertStatus: (id: number | string, estado: number) =>
    apiData(apiClient.patch(`/chat/panic-alerts/${id}/status`, { estado })),
};
