import { notificationsApi } from "@/api/notifications";
import { useSyncExternalStore } from "react";

/**
 * Conteo de notificaciones sin leer compartido entre el header y la bandeja.
 * Se guarda con el id del usuario para no mostrar el conteo de otra sesión.
 */
let state = { userId: 0, total: 0 };
const subs = new Set<() => void>();

const emit = () => subs.forEach((f) => f());

export function setUnread(userId: number, total: number) {
  if (state.userId === userId && state.total === total) return;
  state = { userId, total };
  emit();
}

/** Consulta el conteo al backend (silencioso si falla). */
export async function refreshUnread(userId: number) {
  try {
    const r = await notificationsApi.unreadCount();
    setUnread(userId, r.total);
  } catch {
    /* el indicador es informativo */
  }
}

export function useUnread(userId?: number) {
  const snap = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
    () => state,
  );
  return userId && snap.userId === userId ? snap.total : 0;
}
