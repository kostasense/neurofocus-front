import { appointmentsApi } from "@/api/appointments";
import { assignmentsApi } from "@/api/assignments";
import { chatApi } from "@/api/chat";
import { cryptoApi } from "@/api/crypto";
import { evaluationsApi } from "@/api/evaluations";
import { patientsApi } from "@/api/patients";
import { psychologistsApi } from "@/api/psychologists";
import { recordsApi } from "@/api/records";
import { suggestionsApi } from "@/api/suggestions";
import { usersApi } from "@/api/users";
import {
    Appointment,
    ChatChannel,
    Evaluation,
    PanicAlert,
    PatientListItem,
    Psychologist,
    PsychologistPatient,
    RecordSummary,
    Suggestion,
    User,
} from "@/types/api";

/* ------------------------------------------------------------------ */
/* Tipos de salida                                                     */
/* ------------------------------------------------------------------ */
export type Count = { label: string; value: number };

export type PeriodStats = {
  label: string;
  total: number;
  solicitadas: number;
  confirmadas: number;
  programadas: number; // solicitadas + confirmadas
  realizadas: number;
  canceladas: number;
  noAsistio: number;
  reprogramadas: number;
};

export type InstrumentStats = {
  aplicadas: number;
  promedio: number | null;
  minimo: number | null;
  maximo: number | null;
  niveles: Count[];
};

export type PsychologistRow = {
  id: number;
  nombre: string;
  especialidad: string | null;
  activoParaCitas: boolean;
  chatDisponible: boolean;
  pacientes: number;
  pacientesPrincipales: number;
  citasTotal: number;
  citasProgramadas: number; // solicitadas o confirmadas que aún no terminan
  realizadas: number;
  canceladas: number;
  noAsistio: number;
  expedientes: number;
  evaluacionesPendientes: number;
};

export type Metrics = {
  generatedAt: string;
  failedSources: string[];
  system: {
    cifradoConfigurado: boolean | null;
    versionClave: string | null;
    algoritmo: string | null;
  };
  users: {
    total: number;
    activos: number;
    inactivos: number;
    porRol: Count[];
    nuevos7d: number;
    nuevos30d: number;
    acceso7d: number;
    acceso30d: number;
    nuncaIngresaron: number;
    registrosPorMes: Count[];
  };
  patients: {
    total: number;
    activos: number;
    inactivos: number;
    porTipo: Count[];
    porContacto: Count[];
    edadPromedio: number | null;
    porEdad: Count[];
    conPsicologoPrincipal: number;
    sinPsicologoPrincipal: number;
    conCitas: number;
    sinCitas: number;
    conCitaProgramada: number;
    conEvaluacion: number;
    sinEvaluacion: number;
    conExpediente: number;
  };
  psychologists: {
    total: number;
    activosParaCitas: number;
    chatDisponible: number;
    duracionPromedio: number | null;
    porEspecialidad: Count[];
    conCitas: number;
    conCitasProgramadas: number;
    sinPacientes: number;
    pacientesPorPsicologoPromedio: number | null;
    mayorCarga: { nombre: string; value: number } | null;
    filas: PsychologistRow[];
  };
  assignments: {
    activas: number;
    principales: number;
    adicionales: number;
    pacientesConVarios: number;
  };
  appointments: {
    total: number;
    vigentes: number;
    porEstado: Count[];
    porModalidad: Count[];
    periodos: PeriodStats[];
    tasaAsistencia: number | null;
    tasaCancelacion: number | null;
    anticipacionPromedioDias: number | null;
    duracionPromedioMin: number | null;
    desdeEvaluacion: number;
    porMes: Count[];
    porDiaSemana: Count[];
  };
  evaluations: {
    total: number;
    porEstado: Count[];
    conAlertaPrioritaria: number;
    pendientesRevision: number;
    revisadas: number;
    pacientesConEvaluacion: number;
    porMes: Count[];
    pss14: InstrumentStats;
    gad7: InstrumentStats;
    phq9: InstrumentStats;
  };
  records: {
    total: number;
    porEstado: Count[];
    abiertosEsteMes: number;
    porMes: Count[];
  };
  chat: {
    canales: number;
    abiertos: number;
    cerrados: number;
    habilitados: number;
    sinHabilitar: number;
    activosUltimos7d: number;
    alertas: {
      total: number;
      porEstado: Count[];
      pendientes: number;
      ultimos30d: number;
      pacientesDistintos: number;
      minutosHastaVista: number | null;
      minutosHastaAtencion: number | null;
    };
  };
  suggestions: {
    total: number;
    porEstado: Count[];
    porCategoria: Count[];
    sinAtender: number;
    anonimas: number;
    calificacionPromedio: number | null;
    diasPromedioAtencion: number | null;
    porPsicologo: { nombre: string; total: number; promedio: number | null }[];
  };
};

/* ------------------------------------------------------------------ */
/* Catálogos                                                           */
/* ------------------------------------------------------------------ */
const ESTADO_CITA: Record<number, string> = {
  1: "Solicitada",
  2: "Confirmada",
  3: "Realizada",
  4: "Cancelada",
  5: "No asistió",
  6: "Reprogramada",
};
const MODALIDAD: Record<number, string> = { 1: "Presencial", 2: "Virtual" };
const ESTADO_EVAL: Record<number, string> = {
  1: "Abierta",
  2: "Completa",
  3: "Cerrada incompleta",
  4: "Anulada",
};
const ESTADO_EXP: Record<number, string> = {
  1: "Activo",
  2: "Cerrado",
  3: "Archivado",
};
const ESTADO_SUG: Record<number, string> = {
  1: "Nueva",
  2: "En revisión",
  3: "Atendida",
  4: "Cerrada",
};
const CATEGORIA_SUG: Record<number, string> = {
  1: "Sistema",
  2: "Atención psicológica",
  3: "Citas",
  4: "Privacidad",
  5: "Otro",
};
const ESTADO_ALERTA: Record<number, string> = {
  1: "Emitida",
  2: "Notificada",
  3: "Vista",
  4: "Atendida",
  5: "Cerrada",
};
const ROLES: Record<number, string> = {
  1: "Pacientes",
  2: "Psicólogos",
  3: "Administradores",
};
const TIPO_PERSONA: Record<string, string> = {
  A: "Alumnos",
  D: "Docentes",
  PA: "Personal administrativo",
};
const CONTACTO: Record<number, string> = {
  1: "Correo",
  2: "Teléfono",
  3: "Notificación",
};
const NIVEL_GAD7 = ["Mínimo", "Leve", "Moderado", "Severo"];
const NIVEL_PHQ9 = [
  "Mínimo",
  "Leve",
  "Moderado",
  "Moderadamente severo",
  "Severo",
];
const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const MIN = 60_000;
const DAY = 86_400_000;
const MES = new Intl.DateTimeFormat("es-MX", {
  month: "short",
  year: "numeric",
});

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (v: number[]) =>
  v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null;
const pct = (n: number, d: number) => (d ? round1((n / d) * 100) : null);
const ms = (iso: string | null | undefined) =>
  iso ? new Date(iso).getTime() : NaN;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
/** Semana de lunes a domingo, en hora local del dispositivo. */
const startOfWeek = (d: Date) =>
  addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const monthStart = (d: Date, offset = 0) =>
  new Date(d.getFullYear(), d.getMonth() + offset, 1);

const within = (iso: string | null | undefined, from: Date, to: Date) => {
  const t = ms(iso);
  return t >= from.getTime() && t < to.getTime();
};

/** Cuenta por catálogo numérico, incluyendo categorías en cero. */
function tally<T>(
  items: T[],
  labels: Record<number, string>,
  keyOf: (x: T) => number | null | undefined,
): Count[] {
  return Object.entries(labels).map(([k, label]) => ({
    label,
    value: items.filter((x) => keyOf(x) === Number(k)).length,
  }));
}

/** Serie mensual: `back` meses atrás hasta `forward` meses adelante. */
function monthSeries<T>(
  items: T[],
  dateOf: (x: T) => string | null | undefined,
  now: Date,
  back = 5,
  forward = 0,
): Count[] {
  const out: Count[] = [];
  for (let i = -back; i <= forward; i++) {
    const from = monthStart(now, i);
    const to = monthStart(now, i + 1);
    out.push({
      label: MES.format(from),
      value: items.filter((x) => within(dateOf(x), from, to)).length,
    });
  }
  return out;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (x: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

/* ------------------------------------------------------------------ */
/* Obtención de datos (llamadas a la API)                              */
/* ------------------------------------------------------------------ */
type CryptoStatus = {
  configured: boolean;
  keyVersion: number | string;
  algorithm: string;
};

type Raw = {
  users: User[];
  patients: PatientListItem[];
  psychologists: Psychologist[];
  suggestions: Suggestion[];
  channels: ChatChannel[];
  alerts: PanicAlert[];
  crypto: CryptoStatus | null;
  assignments: Map<number, PsychologistPatient[]>;
  appointments: Map<number, Appointment[]>;
  evaluationsByPsy: Map<number, Evaluation[]>;
  evaluations: Evaluation[]; // sin duplicados
  records: Map<number, RecordSummary[]>;
  failed: string[];
};

async function fetchRaw(): Promise<Raw> {
  const failed = new Set<string>();
  const safe = async <T>(
    source: string,
    fallback: T,
    fn: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await fn();
    } catch {
      failed.add(source);
      return fallback;
    }
  };

  const [
    users,
    patients,
    psychologists,
    suggestions,
    channels,
    alerts,
    crypto,
  ] = await Promise.all([
    safe("Usuarios", [] as User[], () => usersApi.list()),
    safe(
      "Pacientes",
      [] as PatientListItem[],
      () => patientsApi.list() as Promise<PatientListItem[]>,
    ),
    safe("Psicólogos", [] as Psychologist[], () =>
      psychologistsApi.list(false),
    ),
    safe("Sugerencias", [] as Suggestion[], () => suggestionsApi.list()),
    safe(
      "Canales de chat",
      [] as ChatChannel[],
      () => chatApi.channels() as Promise<ChatChannel[]>,
    ),
    safe("Alertas de pánico", [] as PanicAlert[], () => chatApi.alerts()),
    safe(
      "Cifrado",
      null as CryptoStatus | null,
      () => cryptoApi.status() as Promise<CryptoStatus>,
    ),
  ]);

  // Datos que dependen de cada psicólogo.
  const perPsy = await mapLimit(psychologists, 4, async (ps) => {
    const id = ps.id_psicologo;
    const [asig, citas, evals, recs] = await Promise.all([
      safe(
        "Asignaciones",
        [] as PsychologistPatient[],
        () => assignmentsApi.patients(id) as Promise<PsychologistPatient[]>,
      ),
      safe(
        "Citas",
        [] as Appointment[],
        () => appointmentsApi.byPsychologist(id) as Promise<Appointment[]>,
      ),
      safe("Evaluaciones", [] as Evaluation[], () =>
        evaluationsApi.byPsychologist(id),
      ),
      safe("Expedientes", [] as RecordSummary[], () =>
        recordsApi.byPsychologist(id),
      ),
    ]);
    return { id, asig, citas, evals, recs };
  });

  // Pacientes sin psicólogo: sus evaluaciones no salen por psicólogo.
  const assigned = new Set(
    perPsy.flatMap((r) => r.asig.map((a) => a.id_paciente)),
  );
  const unassigned = patients.filter((p) => !assigned.has(p.id_paciente));
  const extra = (
    await mapLimit(unassigned, 6, (p) =>
      safe("Evaluaciones", [] as Evaluation[], () =>
        evaluationsApi.byPatient(p.id_paciente),
      ),
    )
  ).flat();

  const evalMap = new Map<string, Evaluation>();
  for (const e of [...perPsy.flatMap((r) => r.evals), ...extra])
    evalMap.set(String(e.id_evaluacion), e);

  return {
    users,
    patients,
    psychologists,
    suggestions,
    channels,
    alerts,
    crypto,
    assignments: new Map(perPsy.map((r) => [r.id, r.asig])),
    appointments: new Map(perPsy.map((r) => [r.id, r.citas])),
    evaluationsByPsy: new Map(perPsy.map((r) => [r.id, r.evals])),
    evaluations: [...evalMap.values()],
    records: new Map(perPsy.map((r) => [r.id, r.recs])),
    failed: [...failed],
  };
}

/* ------------------------------------------------------------------ */
/* Cálculo por tema                                                    */
/* ------------------------------------------------------------------ */
const programada = (c: Appointment) => c.estado === 1 || c.estado === 2;
const vigente = (c: Appointment, now: Date) =>
  programada(c) && ms(c.fin) >= now.getTime();

function periodStats(
  citas: Appointment[],
  label: string,
  from: Date,
  to: Date,
): PeriodStats {
  const c = citas.filter((x) => within(x.inicio, from, to));
  const n = (e: number) => c.filter((x) => x.estado === e).length;
  return {
    label,
    total: c.length,
    solicitadas: n(1),
    confirmadas: n(2),
    programadas: n(1) + n(2),
    realizadas: n(3),
    canceladas: n(4),
    noAsistio: n(5),
    reprogramadas: n(6),
  };
}

function buildAppointments(raw: Raw, now: Date): Metrics["appointments"] {
  const citas = [...raw.appointments.values()].flat();
  const hoy = startOfDay(now);
  const semana = startOfWeek(now);
  const realizadas = citas.filter((c) => c.estado === 3).length;
  const noAsistio = citas.filter((c) => c.estado === 5).length;
  const canceladas = citas.filter((c) => c.estado === 4).length;

  const anticipacion = citas
    .filter((c) => c.fecha_creacion)
    .map((c) => (ms(c.inicio) - ms(c.fecha_creacion)) / DAY)
    .filter((d) => d >= 0);
  const duraciones = citas.map((c) => (ms(c.fin) - ms(c.inicio)) / MIN);

  // Carga por día de la semana (se excluyen canceladas y reprogramadas).
  const porDia = DIAS.map((label) => ({ label, value: 0 }));
  for (const c of citas) {
    if (c.estado === 4 || c.estado === 6) continue;
    porDia[(new Date(c.inicio).getDay() + 6) % 7].value++;
  }

  return {
    total: citas.length,
    vigentes: citas.filter((c) => vigente(c, now)).length,
    porEstado: tally(citas, ESTADO_CITA, (c) => c.estado),
    porModalidad: tally(citas, MODALIDAD, (c) => c.modalidad),
    periodos: [
      periodStats(citas, "Hoy", hoy, addDays(hoy, 1)),
      periodStats(citas, "Esta semana", semana, addDays(semana, 7)),
      periodStats(citas, "Próximos 7 días", now, addDays(now, 7)),
      periodStats(citas, "Este mes", monthStart(now), monthStart(now, 1)),
      periodStats(
        citas,
        "Mes siguiente",
        monthStart(now, 1),
        monthStart(now, 2),
      ),
      periodStats(citas, "Mes anterior", monthStart(now, -1), monthStart(now)),
    ],
    tasaAsistencia: pct(realizadas, realizadas + noAsistio),
    tasaCancelacion: pct(canceladas, citas.length),
    anticipacionPromedioDias: avg(anticipacion),
    duracionPromedioMin: avg(duraciones),
    desdeEvaluacion: citas.filter((c) => c.id_evaluacion != null).length,
    porMes: monthSeries(citas, (c) => c.inicio, now, 5, 1),
    porDiaSemana: porDia,
  };
}

const pendiente = (e: Evaluation) =>
  !!e.requiere_revision && e.revisada_por == null && e.estado !== 4;

function buildPsychologists(raw: Raw, now: Date): Metrics["psychologists"] {
  const ps = raw.psychologists;
  const filas: PsychologistRow[] = ps.map((p) => {
    const asig = raw.assignments.get(p.id_psicologo) ?? [];
    const citas = raw.appointments.get(p.id_psicologo) ?? [];
    const n = (e: number) => citas.filter((c) => c.estado === e).length;
    return {
      id: p.id_psicologo,
      nombre: p.nombre,
      especialidad: p.especialidad,
      activoParaCitas: p.activo_para_citas,
      chatDisponible: p.chat_disponible,
      pacientes: asig.length,
      pacientesPrincipales: asig.filter((a) => a.es_principal).length,
      citasTotal: citas.length,
      citasProgramadas: citas.filter((c) => vigente(c, now)).length,
      realizadas: n(3),
      canceladas: n(4),
      noAsistio: n(5),
      expedientes: (raw.records.get(p.id_psicologo) ?? []).length,
      evaluacionesPendientes: (
        raw.evaluationsByPsy.get(p.id_psicologo) ?? []
      ).filter(pendiente).length,
    };
  });

  const especialidades = new Map<string, number>();
  for (const p of ps) {
    const k = p.especialidad?.trim() || "Sin especialidad";
    especialidades.set(k, (especialidades.get(k) ?? 0) + 1);
  }
  const mayor = [...filas].sort((a, b) => b.pacientes - a.pacientes)[0];

  return {
    total: ps.length,
    activosParaCitas: ps.filter((p) => p.activo_para_citas).length,
    chatDisponible: ps.filter((p) => p.chat_disponible).length,
    duracionPromedio: avg(ps.map((p) => p.duracion_cita_minutos)),
    porEspecialidad: [...especialidades].map(([label, value]) => ({
      label,
      value,
    })),
    conCitas: filas.filter((f) => f.citasTotal > 0).length,
    conCitasProgramadas: filas.filter((f) => f.citasProgramadas > 0).length,
    sinPacientes: filas.filter((f) => f.pacientes === 0).length,
    pacientesPorPsicologoPromedio: avg(filas.map((f) => f.pacientes)),
    mayorCarga:
      mayor && mayor.pacientes > 0
        ? { nombre: mayor.nombre, value: mayor.pacientes }
        : null,
    filas,
  };
}

function buildPatients(raw: Raw, now: Date): Metrics["patients"] {
  const pts = raw.patients;
  const asignaciones = [...raw.assignments.values()].flat();
  const principales = new Set(
    asignaciones.filter((a) => a.es_principal).map((a) => a.id_paciente),
  );
  const citas = [...raw.appointments.values()].flat();
  const conCita = new Set(citas.map((c) => c.id_paciente));
  const conProgramada = new Set(
    citas.filter((c) => vigente(c, now)).map((c) => c.id_paciente),
  );
  const conEval = new Set(raw.evaluations.map((e) => e.id_paciente));
  const conExp = new Set(
    [...raw.records.values()].flat().map((r) => r.id_paciente),
  );
  const ids = new Set(pts.map((p) => p.id_paciente));
  const inPts = (s: Set<number>) => [...s].filter((i) => ids.has(i)).length;

  const edades = pts
    .filter((p) => p.fecha_nacimiento)
    .map((p) => (now.getTime() - ms(p.fecha_nacimiento)) / (365.25 * DAY))
    .filter((e) => e > 0 && e < 120);
  const rango = (min: number, max: number) =>
    edades.filter((e) => e >= min && e < max).length;

  return {
    total: pts.length,
    activos: pts.filter((p) => p.activo).length,
    inactivos: pts.filter((p) => !p.activo).length,
    porTipo: Object.entries(TIPO_PERSONA).map(([k, label]) => ({
      label,
      value: pts.filter((p) => p.tipo_persona === k).length,
    })),
    porContacto: [
      ...tally(pts, CONTACTO, (p) => p.contacto_preferido),
      {
        label: "Sin definir",
        value: pts.filter(
          (p) => !p.contacto_preferido || !CONTACTO[p.contacto_preferido],
        ).length,
      },
    ],
    edadPromedio: avg(edades),
    porEdad: [
      { label: "Menos de 20", value: rango(0, 20) },
      { label: "20 a 24", value: rango(20, 25) },
      { label: "25 a 34", value: rango(25, 35) },
      { label: "35 o más", value: rango(35, 200) },
      { label: "Sin fecha", value: pts.length - edades.length },
    ],
    conPsicologoPrincipal: inPts(principales),
    sinPsicologoPrincipal: pts.length - inPts(principales),
    conCitas: inPts(conCita),
    sinCitas: pts.length - inPts(conCita),
    conCitaProgramada: inPts(conProgramada),
    conEvaluacion: inPts(conEval),
    sinEvaluacion: pts.length - inPts(conEval),
    conExpediente: inPts(conExp),
  };
}

function instrument(
  evals: Evaluation[],
  score: (e: Evaluation) => number | null,
  level: ((e: Evaluation) => number | null) | null,
  labels: string[],
): InstrumentStats {
  const scores = evals.map(score).filter((x): x is number => x != null);
  return {
    aplicadas: scores.length,
    promedio: avg(scores),
    minimo: scores.length ? Math.min(...scores) : null,
    maximo: scores.length ? Math.max(...scores) : null,
    niveles: level
      ? labels.map((label, i) => ({
          label,
          value: evals.filter((e) => score(e) != null && level(e) === i).length,
        }))
      : [],
  };
}

function buildEvaluations(raw: Raw, now: Date): Metrics["evaluations"] {
  const ev = raw.evaluations;
  return {
    total: ev.length,
    porEstado: tally(ev, ESTADO_EVAL, (e) => e.estado),
    conAlertaPrioritaria: ev.filter((e) => e.alerta_prioritaria === 1).length,
    pendientesRevision: ev.filter(pendiente).length,
    revisadas: ev.filter((e) => e.revisada_por != null).length,
    pacientesConEvaluacion: new Set(ev.map((e) => e.id_paciente)).size,
    porMes: monthSeries(ev, (e) => e.fecha_inicio, now),
    pss14: instrument(ev, (e) => e.pss14_puntaje, null, []),
    gad7: instrument(
      ev,
      (e) => e.gad7_puntaje,
      (e) => e.gad7_nivel,
      NIVEL_GAD7,
    ),
    phq9: instrument(
      ev,
      (e) => e.phq9_puntaje,
      (e) => e.phq9_nivel,
      NIVEL_PHQ9,
    ),
  };
}

function buildRecords(raw: Raw, now: Date): Metrics["records"] {
  const rs = [...raw.records.values()].flat();
  return {
    total: rs.length,
    porEstado: tally(rs, ESTADO_EXP, (r) => r.estado),
    abiertosEsteMes: rs.filter((r) =>
      within(r.fecha_apertura, monthStart(now), monthStart(now, 1)),
    ).length,
    porMes: monthSeries(rs, (r) => r.fecha_apertura, now),
  };
}

function buildChat(raw: Raw, now: Date): Metrics["chat"] {
  const ch = raw.channels;
  const al = raw.alerts;
  const hace7 = addDays(now, -7);
  const hace30 = addDays(now, -30);
  const vista = al
    .filter((a) => a.fecha_vista)
    .map((a) => (ms(a.fecha_vista) - ms(a.fecha_alerta)) / MIN)
    .filter((m) => m >= 0);
  const atencion = al
    .filter((a) => a.fecha_atencion)
    .map((a) => (ms(a.fecha_atencion) - ms(a.fecha_alerta)) / MIN)
    .filter((m) => m >= 0);

  return {
    canales: ch.length,
    abiertos: ch.filter((c) => c.abierto).length,
    cerrados: ch.filter((c) => !c.abierto).length,
    habilitados: ch.filter((c) => c.abierto && c.habilitado_por_psicologo)
      .length,
    sinHabilitar: ch.filter((c) => c.abierto && !c.habilitado_por_psicologo)
      .length,
    activosUltimos7d: ch.filter(
      (c) => ms(c.ultima_actividad) >= hace7.getTime(),
    ).length,
    alertas: {
      total: al.length,
      porEstado: tally(al, ESTADO_ALERTA, (a) => a.estado),
      pendientes: al.filter((a) => a.estado <= 3).length,
      ultimos30d: al.filter((a) => ms(a.fecha_alerta) >= hace30.getTime())
        .length,
      pacientesDistintos: new Set(al.map((a) => a.id_paciente)).size,
      minutosHastaVista: avg(vista),
      minutosHastaAtencion: avg(atencion),
    },
  };
}

function buildSuggestions(raw: Raw): Metrics["suggestions"] {
  const sg = raw.suggestions;
  const calif = sg
    .map((s) => s.calificacion)
    .filter((c): c is number => c != null);
  const atencion = sg
    .filter((s) => s.fecha_atencion)
    .map((s) => (ms(s.fecha_atencion) - ms(s.fecha_creacion)) / DAY)
    .filter((d) => d >= 0);

  const porPsi = new Map<string, { total: number; notas: number[] }>();
  for (const s of sg) {
    if (!s.psicologo_referido) continue;
    const e = porPsi.get(s.psicologo_referido) ?? { total: 0, notas: [] };
    e.total++;
    if (s.calificacion != null) e.notas.push(s.calificacion);
    porPsi.set(s.psicologo_referido, e);
  }

  return {
    total: sg.length,
    porEstado: tally(sg, ESTADO_SUG, (s) => s.estado),
    porCategoria: tally(sg, CATEGORIA_SUG, (s) => s.categoria),
    sinAtender: sg.filter((s) => s.estado === 1).length,
    anonimas: sg.filter((s) => s.id_autor == null).length,
    calificacionPromedio: avg(calif),
    diasPromedioAtencion: avg(atencion),
    porPsicologo: [...porPsi]
      .map(([nombre, e]) => ({
        nombre,
        total: e.total,
        promedio: avg(e.notas),
      }))
      .sort((a, b) => b.total - a.total),
  };
}

function buildUsers(raw: Raw, now: Date): Metrics["users"] {
  const us = raw.users;
  const hace7 = addDays(now, -7).getTime();
  const hace30 = addDays(now, -30).getTime();
  return {
    total: us.length,
    activos: us.filter((u) => u.activo).length,
    inactivos: us.filter((u) => !u.activo).length,
    porRol: tally(us, ROLES, (u) => u.id_rol),
    nuevos7d: us.filter((u) => ms(u.fecha_creacion) >= hace7).length,
    nuevos30d: us.filter((u) => ms(u.fecha_creacion) >= hace30).length,
    acceso7d: us.filter((u) => ms(u.ultimo_acceso) >= hace7).length,
    acceso30d: us.filter((u) => ms(u.ultimo_acceso) >= hace30).length,
    nuncaIngresaron: us.filter((u) => !u.ultimo_acceso).length,
    registrosPorMes: monthSeries(us, (u) => u.fecha_creacion, now),
  };
}

function buildAssignments(raw: Raw): Metrics["assignments"] {
  const a = [...raw.assignments.values()].flat();
  const porPaciente = new Map<number, number>();
  for (const x of a)
    porPaciente.set(x.id_paciente, (porPaciente.get(x.id_paciente) ?? 0) + 1);
  return {
    activas: a.length,
    principales: a.filter((x) => x.es_principal).length,
    adicionales: a.filter((x) => !x.es_principal).length,
    pacientesConVarios: [...porPaciente.values()].filter((n) => n > 1).length,
  };
}

/* ------------------------------------------------------------------ */
/* Punto de entrada                                                    */
/* ------------------------------------------------------------------ */
export async function loadMetrics(now = new Date()): Promise<Metrics> {
  const raw = await fetchRaw();
  return {
    generatedAt: now.toISOString(),
    failedSources: raw.failed,
    system: {
      cifradoConfigurado: raw.crypto ? raw.crypto.configured : null,
      versionClave: raw.crypto ? String(raw.crypto.keyVersion) : null,
      algoritmo: raw.crypto ? raw.crypto.algorithm : null,
    },
    users: buildUsers(raw, now),
    patients: buildPatients(raw, now),
    psychologists: buildPsychologists(raw, now),
    assignments: buildAssignments(raw),
    appointments: buildAppointments(raw, now),
    evaluations: buildEvaluations(raw, now),
    records: buildRecords(raw, now),
    chat: buildChat(raw, now),
    suggestions: buildSuggestions(raw),
  };
}
