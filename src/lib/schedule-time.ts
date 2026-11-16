/**
 * Conversión de bloques de horario entre la hora local del dispositivo (la que
 * escribe y ve el psicólogo) y UTC (lo que guarda `HorarioPsicologo`).
 *
 * - Escribir: `localToUtcRows` devuelve 1 o 2 filas UTC listas para crear.
 * - Leer: `utcRowsToLocal` devuelve bloques en hora local (con los ids de las
 *   filas que los forman, por si hay que desactivarlos o reemplazarlos).
 * - La hora de fin 24:00 se guarda como 23:59 (TIME no admite 24:00).
 * - El horario de verano se resuelve con la fecha de la próxima ocurrencia del
 *   día; si la zona cambia de horario, hay que volver a guardar los bloques.
 */
import { hhmm, toMinutes, type Schedule } from "@/lib/availability";

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutos -> "HH:mm" (1440 se guarda como 23:59). */
export const minutesToTime = (min: number) =>
  min >= 1440 ? "23:59" : `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/** "HH:mm" o TIME serializado -> minutos (la hora de fin 23:59 vale 1440). */
export const timeToMinutes = toMinutes;

export type UtcRow = {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
};

export type LocalBlock = {
  dia_semana: number; // 1 lunes ... 7 domingo, en hora local
  inicioMin: number;
  finMin: number; // hasta 1440
  modalidad: 1 | 2;
  ids: number[]; // filas UTC que lo forman
};

const isoDow = (jsDay: number) => ((jsDay + 6) % 7) + 1;

/** Próxima fecha (hoy incluida) cuyo día de la semana local es `dia`. */
function nextLocalDate(dia: number, from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (isoDow(d.getDay()) !== dia) d.setDate(d.getDate() + 1);
  return d;
}

/** Próxima fecha UTC (como Date UTC) cuyo día de la semana UTC es `dia`. */
function nextUtcDate(dia: number, from = new Date()): Date {
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  while (isoDow(d.getUTCDay()) !== dia) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** Bloque escrito en hora local -> filas UTC (una, o dos si cruza la medianoche UTC). */
export function localToUtcRows(
  dia: number,
  inicioMin: number,
  finMin: number,
  from = new Date(),
): UtcRow[] {
  const d = nextLocalDate(dia, from);
  const start = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0,
    inicioMin,
  );
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, finMin);

  const sDay = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const eDay = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  const sMin = start.getUTCHours() * 60 + start.getUTCMinutes();
  const eMin = end.getUTCHours() * 60 + end.getUTCMinutes();
  const sDow = isoDow(start.getUTCDay());

  if (sDay === eDay)
    return [
      {
        dia_semana: sDow,
        hora_inicio: minutesToTime(sMin),
        hora_fin: minutesToTime(eMin),
      },
    ];
  if (eMin === 0)
    return [
      {
        dia_semana: sDow,
        hora_inicio: minutesToTime(sMin),
        hora_fin: minutesToTime(1440),
      },
    ];
  return [
    {
      dia_semana: sDow,
      hora_inicio: minutesToTime(sMin),
      hora_fin: minutesToTime(1440),
    },
    {
      dia_semana: isoDow(end.getUTCDay()),
      hora_inicio: minutesToTime(0),
      hora_fin: minutesToTime(eMin),
    },
  ];
}

/** Filas UTC -> bloques en hora local, uniendo los que quedaron contiguos. */
export function utcRowsToLocal(
  rows: Schedule[],
  from = new Date(),
): LocalBlock[] {
  type Piece = LocalBlock & { startMs: number; endMs: number };
  const pieces: Piece[] = [];

  for (const r of rows) {
    if (!r.activo) continue;
    const base = nextUtcDate(r.dia_semana, from);
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const d = base.getUTCDate();
    const startMs = Date.UTC(y, m, d, 0, toMinutes(r.hora_inicio));
    const endMs = Date.UTC(y, m, d, 0, toMinutes(r.hora_fin, true));
    const s = new Date(startMs);
    const e = new Date(endMs);
    pieces.push({
      dia_semana: isoDow(s.getDay()),
      inicioMin: s.getHours() * 60 + s.getMinutes(),
      finMin: 0, // se completa abajo
      modalidad: r.modalidad,
      ids: [r.id_horario],
      startMs,
      endMs,
    });
    // fin en hora local; si cae en otro día local, el bloque llega a 24:00
    const sameDay = s.toDateString() === e.toDateString();
    pieces[pieces.length - 1].finMin = sameDay
      ? e.getHours() * 60 + e.getMinutes()
      : 1440;
    if (!sameDay && !(e.getHours() === 0 && e.getMinutes() === 0)) {
      // continúa al día local siguiente
      pieces.push({
        dia_semana: isoDow(e.getDay()),
        inicioMin: 0,
        finMin: e.getHours() * 60 + e.getMinutes(),
        modalidad: r.modalidad,
        ids: [r.id_horario],
        startMs: endMs,
        endMs,
      });
    }
  }

  // Une piezas contiguas del mismo día local (filas partidas en medianoche UTC).
  pieces.sort(
    (a, b) => a.dia_semana - b.dia_semana || a.inicioMin - b.inicioMin,
  );
  const out: LocalBlock[] = [];
  for (const p of pieces) {
    const last = out[out.length - 1];
    if (
      last &&
      last.dia_semana === p.dia_semana &&
      last.modalidad === p.modalidad &&
      last.finMin === p.inicioMin
    ) {
      last.finMin = p.finMin;
      last.ids = [...new Set([...last.ids, ...p.ids])];
    } else {
      out.push({
        dia_semana: p.dia_semana,
        inicioMin: p.inicioMin,
        finMin: p.finMin,
        modalidad: p.modalidad,
        ids: [...p.ids],
      });
    }
  }
  return out;
}

export { hhmm };

