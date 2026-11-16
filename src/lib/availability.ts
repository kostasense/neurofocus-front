/**
 * Cálculo de disponibilidad para agendar citas.
 *
 * - Los bloques de `HorarioPsicologo` se guardan en UTC (día de la semana y hora
 *   UTC). El psicólogo los escribe en su hora local y `schedule-time.ts` los
 *   convierte al guardar y al mostrar. Un bloque que cruza la medianoche UTC se
 *   guarda en dos filas (la hora de fin 24:00 se guarda como 23:59).
 * - Los intervalos ocupados llegan en UTC (instantes) y se comparan como instantes.
 * - Un horario se genera cada `duracion` minutos dentro de cada bloque activo.
 */
export type Schedule = {
  id_horario: number;
  id_psicologo: number;
  dia_semana: number; // 1 lunes ... 7 domingo
  hora_inicio: string; // TIME: "1970-01-01T08:00:00.000Z" o "08:00:00"
  hora_fin: string;
  modalidad: 1 | 2; // 1 presencial, 2 virtual
  activo: boolean;
};

export type Interval = { inicio: string; fin: string }; // ISO UTC

export type SlotStatus = "libre" | "ocupado" | "tuya";

export type Slot = {
  start: Date;
  end: Date;
  modalidad: 1 | 2;
  blockId: number;
  status: SlotStatus;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Extrae HH:mm de un TIME serializado por el backend. */
export const hhmm = (v: string) =>
  /^\d{4}-/.test(v) ? v.slice(11, 16) : v.slice(0, 5);

/** Minutos desde medianoche; una hora de fin 23:59 equivale a 24:00. */
export const toMinutes = (v: string, isEnd = false) => {
  const [h, m] = hhmm(v).split(":").map(Number);
  const t = h * 60 + m;
  return isEnd && t === 23 * 60 + 59 ? 1440 : t;
};

/** Clave de día en hora local: yyyy-mm-dd. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const startOfMonth = (d: Date, offset = 0) =>
  new Date(d.getFullYear(), d.getMonth() + offset, 1);

/** Cuadrícula del mes con semanas de lunes a domingo; `null` rellena los huecos. */
export function monthMatrix(month: Date): (Date | null)[][] {
  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => new Date(y, m, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const overlaps = (start: Date, end: Date, list: Interval[]) =>
  list.some(
    (i) =>
      start.getTime() < new Date(i.fin).getTime() &&
      end.getTime() > new Date(i.inicio).getTime(),
  );

/**
 * Horarios de un día. `busy` son las citas activas del psicólogo (de cualquier
 * paciente); `own` son las citas activas del propio paciente con cualquier
 * psicólogo. Los horarios pasados no se incluyen.
 */
export function slotsForDay(
  day: Date,
  schedules: Schedule[],
  duracionMin: number,
  busy: Interval[],
  own: Interval[],
  now: Date = new Date(),
): Slot[] {
  if (duracionMin <= 0) return [];
  const target = dayKey(day);
  const out: Slot[] = [];

  // Tramos de los bloques (UTC) alrededor del día pedido. Se revisan varios días
  // porque un día del dispositivo puede cubrir fechas UTC vecinas.
  type Span = { start: number; end: number; modalidad: 1 | 2; blockId: number };
  const spans: Span[] = [];
  for (let off = -2; off <= 2; off++) {
    const base = new Date(
      Date.UTC(day.getFullYear(), day.getMonth(), day.getDate() + off),
    );
    const dow = ((base.getUTCDay() + 6) % 7) + 1;
    for (const s of schedules) {
      if (!s.activo || s.dia_semana !== dow) continue;
      const y = base.getUTCFullYear();
      const m = base.getUTCMonth();
      const d = base.getUTCDate();
      spans.push({
        start: Date.UTC(y, m, d, 0, toMinutes(s.hora_inicio)),
        end: Date.UTC(y, m, d, 0, toMinutes(s.hora_fin, true)),
        modalidad: s.modalidad,
        blockId: s.id_horario,
      });
    }
  }

  // Une filas contiguas (bloque partido en la medianoche UTC) para que la
  // cuadrícula de horarios arranque donde empieza el bloque original.
  spans.sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  for (const sp of spans) {
    const last = merged[merged.length - 1];
    if (last && last.end === sp.start && last.modalidad === sp.modalidad)
      last.end = sp.end;
    else merged.push({ ...sp });
  }

  const step = duracionMin * 60_000;
  for (const sp of merged) {
    for (let t = sp.start; t + step <= sp.end; t += step) {
      const start = new Date(t);
      const end = new Date(t + step);
      if (dayKey(start) !== target) continue;
      if (start.getTime() <= now.getTime()) continue;
      const status: SlotStatus = overlaps(start, end, own)
        ? "tuya"
        : overlaps(start, end, busy)
          ? "ocupado"
          : "libre";
      out.push({
        start,
        end,
        modalidad: sp.modalidad,
        blockId: sp.blockId,
        status,
      });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Cantidad de horarios libres por día del mes (clave yyyy-mm-dd). */
export function freeByDay(
  month: Date,
  schedules: Schedule[],
  duracionMin: number,
  busy: Interval[],
  own: Interval[],
  now: Date = new Date(),
): Map<string, number> {
  const out = new Map<string, number>();
  for (const week of monthMatrix(month))
    for (const day of week) {
      if (!day) continue;
      const free = slotsForDay(
        day,
        schedules,
        duracionMin,
        busy,
        own,
        now,
      ).filter((s) => s.status === "libre").length;
      out.set(dayKey(day), free);
    }
  return out;
}
