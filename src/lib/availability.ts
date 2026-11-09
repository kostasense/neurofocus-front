/**
 * Cálculo de disponibilidad para agendar citas.
 *
 * - Los bloques de `HorarioPsicologo` son hora local recurrente (sin zona): se
 *   interpretan en la zona del dispositivo de quien agenda.
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

const toMinutes = (v: string) => {
  const [h, m] = hhmm(v).split(":").map(Number);
  return h * 60 + m;
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
  const dow = ((day.getDay() + 6) % 7) + 1;
  const y = day.getFullYear();
  const m = day.getMonth();
  const d = day.getDate();
  const out: Slot[] = [];

  for (const s of schedules) {
    if (!s.activo || s.dia_semana !== dow) continue;
    const from = toMinutes(s.hora_inicio);
    const to = toMinutes(s.hora_fin);
    for (let t = from; t + duracionMin <= to; t += duracionMin) {
      const start = new Date(y, m, d, 0, t);
      const end = new Date(y, m, d, 0, t + duracionMin);
      if (start.getTime() <= now.getTime()) continue;
      const status: SlotStatus = overlaps(start, end, own)
        ? "tuya"
        : overlaps(start, end, busy)
          ? "ocupado"
          : "libre";
      out.push({
        start,
        end,
        modalidad: s.modalidad,
        blockId: s.id_horario,
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
