/** Los errores de class-validator llegan como arreglo de mensajes. */
export function errMsg(e: any, fallback: string): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(". ");
  return m ?? fallback;
}
