const ZONA = Intl.DateTimeFormat().resolvedOptions().timeZone; // zona del dispositivo
const LOCALE = "es-MX";

const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v));

/** Instante (UTC en BD) -> fecha y hora en la zona del dispositivo. */
export const formatDateTime = (v: string | Date) =>
  new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ZONA,
  }).format(toDate(v));

/** Instante -> solo fecha en la zona del dispositivo. */
export const formatDate = (v: string | Date) =>
  new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeZone: ZONA,
  }).format(toDate(v));

/** Instante -> solo hora en la zona del dispositivo. */
export const formatTime = (v: string | Date) =>
  new Intl.DateTimeFormat(LOCALE, {
    timeStyle: "short",
    timeZone: ZONA,
  }).format(toDate(v));

/** Columna DATE (sin hora): no se convierte de zona. */
export const formatDateOnly = (v: string) =>
  new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(v));

/** Columna TIME (horario local del psicólogo): se muestra tal cual, HH:mm. */
export const formatTimeOnly = (v: string) =>
  /^\d{4}-/.test(v) ? v.slice(11, 16) : v.slice(0, 5);

/** Para pantallas donde importa recordar en qué zona se está viendo. */
export const deviceZone = ZONA;

export const roleHome = (role: number) =>
  role === 1
    ? "/(app)/patient"
    : role === 2
      ? "/(app)/psychologist"
      : "/(app)/admin";
