import { appointmentsApi } from "@/api/appointments";
import { assignmentsApi } from "@/api/assignments";
import { evaluationsApi } from "@/api/evaluations";
import { patientsApi } from "@/api/patients";
import { psychologistsApi } from "@/api/psychologists";
import { recordsApi } from "@/api/records";
import { EmptyState } from "@/components/feedback/empty-state";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { GAD7, PHQ9, PSS14 } from "@/lib/instruments";
import type { Appointment, DashboardPatient, Evaluation } from "@/types/api";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Catálogos y utilidades                                              */
/* ------------------------------------------------------------------ */
const TIPO: Record<string, string> = {
  A: "Alumno",
  D: "Docente",
  PA: "Personal administrativo",
};
const ESTADO_EXP: Record<number, string> = {
  1: "Activo",
  2: "Cerrado",
  3: "Archivado",
};
const ESTADO_CITA: Record<number, string> = {
  1: "Solicitada",
  2: "Confirmada",
  3: "Realizada",
  4: "Cancelada",
  5: "No asistió",
  6: "Reprogramada",
};
const ESTADO_EVAL: Record<number, string> = {
  1: "Abierta",
  2: "Completa",
  3: "Cerrada incompleta",
  4: "Anulada",
};
const DAY_MS = 86_400_000;

const CONTACTO: Record<number, string> = {
  1: "Correo electrónico",
  2: "Teléfono",
  3: "Notificación en la plataforma",
};

/** Respuesta de GET /patients/:id (solo se usan los datos de contacto). */
type PatientContact = {
  correo: string;
  telefono: string | null;
  telefonoConfianza: string | null;
  contactoPreferido: 1 | 2 | 3 | null;
};

type AssignedPatient = {
  id_asignacion: number;
  id_paciente: number;
  paciente: string;
  correo: string;
  num_control_o_num_empleado: string;
  tipo_persona: string;
  es_principal: boolean | number;
  fecha_inicio: string;
};

type Row = DashboardPatient & {
  correo?: string;
  num_control_o_num_empleado?: string;
  es_principal?: boolean;
};

type Filter = "todos" | "sin_cita" | "sin_expediente" | "sin_evaluacion";

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};
const tipoLabel = (t?: string | null) =>
  t ? (TIPO[t.trim()] ?? t.trim()) : "";

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */
function Choice<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            onPress={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5",
              on ? "border-primary bg-primary" : "border-border bg-surface",
            )}
          >
            <Text
              className={cn(
                "font-sans text-sm",
                on ? "font-semibold text-white" : "text-ink",
              )}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Pill({
  text,
  tone,
}: {
  text: string;
  tone: "ok" | "muted" | "warn" | "danger";
}) {
  return (
    <Text
      className={cn(
        "rounded-nf-sm px-2 py-0.5 font-sans text-xs",
        tone === "ok" && "bg-primary-light text-primary-dark",
        tone === "warn" && "bg-amber-100 text-amber-800",
        tone === "danger" && "bg-red-100 text-danger",
        tone === "muted" && "bg-border text-muted",
      )}
    >
      {text}
    </Text>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-w-[140px] flex-1 gap-1">
      <Muted>{label}</Muted>
      <Text className="font-sans text-xl font-semibold text-ink">{value}</Text>
    </Card>
  );
}

const staleEvaluation = (p: Row) =>
  !p.fecha_ultima_evaluacion ||
  Date.now() - new Date(p.fecha_ultima_evaluacion).getTime() > 30 * DAY_MS;

/* ------------------------------------------------------------------ */
/* Expediente: crear                                                   */
/* ------------------------------------------------------------------ */
function CreateRecord({
  patient,
  onCreated,
}: {
  patient: Row;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      await recordsApi.create({
        idPaciente: patient.id_paciente,
        ...(motivo.trim() ? { motivoConsulta: motivo.trim() } : {}),
      });
      onCreated();
    } catch (e) {
      setError(errMsg(e, "No fue posible crear el expediente"));
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <View className="flex-row">
        <Button
          title="Crear expediente"
          variant="secondary"
          onPress={() => setOpen(true)}
        />
      </View>
    );

  return (
    <View className="gap-2">
      <Input
        label="Motivo de consulta (opcional)"
        value={motivo}
        onChangeText={setMotivo}
        multiline
        maxLength={1000}
        style={{ minHeight: 80, textAlignVertical: "top", paddingTop: 10 }}
      />
      {error ? (
        <Text className="font-sans text-sm text-danger">{error}</Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        <Button
          title="Crear expediente"
          loading={busy}
          onPress={() => void create()}
        />
        <Button
          title="Cancelar"
          variant="secondary"
          onPress={() => setOpen(false)}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Detalle del paciente                                                */
/* ------------------------------------------------------------------ */
function PatientDetail({
  p,
  citas,
  onChanged,
}: {
  p: Row;
  citas: Appointment[];
  onChanged: () => void;
}) {
  const [evals, setEvals] = useState<Evaluation[] | null>(null);
  const [evalError, setEvalError] = useState("");
  const [contact, setContact] = useState<PatientContact | null>(null);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    let alive = true;
    (patientsApi.get(p.id_paciente) as Promise<PatientContact>)
      .then((r) => alive && setContact(r))
      .catch((e) => {
        if (!alive) return;
        setContactError(
          e?.response?.status === 403
            ? "No tienes permiso para ver los datos de contacto (falta el parche del backend)."
            : errMsg(e, "No se pudieron cargar los datos de contacto"),
        );
      });
    return () => {
      alive = false;
    };
  }, [p.id_paciente]);

  useEffect(() => {
    let alive = true;
    evaluationsApi
      .byPatient(p.id_paciente)
      .then((r) => alive && setEvals(r))
      .catch((e) => {
        if (!alive) return;
        setEvalError(errMsg(e, "No se pudieron cargar las evaluaciones"));
        setEvals([]);
      });
    return () => {
      alive = false;
    };
  }, [p.id_paciente]);

  const now = Date.now();
  const mine = citas.filter((c) => c.id_paciente === p.id_paciente);
  const upcoming = mine
    .filter(
      (c) =>
        (c.estado === 1 || c.estado === 2) &&
        new Date(c.inicio).getTime() > now,
    )
    .sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio))
    .slice(0, 3);
  const past = mine
    .filter(
      (c) =>
        !(
          (c.estado === 1 || c.estado === 2) &&
          new Date(c.inicio).getTime() > now
        ),
    )
    .sort((a, b) => +new Date(b.inicio) - +new Date(a.inicio))
    .slice(0, 3);
  const done = mine.filter((c) => c.estado === 3).length;
  const missed = mine.filter((c) => c.estado === 5).length;

  return (
    <View className="gap-4 border-t border-border pt-3">
      {/* Contacto */}
      <View className="gap-1">
        <Text className="font-sans text-sm font-semibold text-ink">
          Contacto
        </Text>
        {contactError ? (
          <Text className="font-sans text-sm text-danger">{contactError}</Text>
        ) : !contact ? (
          <Muted>Cargando…</Muted>
        ) : (
          <>
            <Text className="font-sans text-[14px] text-ink">
              Correo: {contact.correo}
            </Text>
            <Text className="font-sans text-[14px] text-ink">
              Teléfono: {contact.telefono ?? "No registrado"}
            </Text>
            <Text className="font-sans text-[14px] text-ink">
              Teléfono de confianza:{" "}
              {contact.telefonoConfianza ?? "No registrado"}
            </Text>
            <Muted>
              Prefiere ser contactado por:{" "}
              {contact.contactoPreferido
                ? CONTACTO[contact.contactoPreferido]
                : "Sin preferencia"}
            </Muted>
            <Muted>
              Úsalos solo para fines de atención y con confidencialidad.
            </Muted>
          </>
        )}
      </View>

      {/* Citas */}
      <View className="gap-2">
        <Text className="font-sans text-sm font-semibold text-ink">Citas</Text>
        <Muted>
          {done} realizadas · {missed} sin asistencia · {mine.length} en total
        </Muted>
        {upcoming.length === 0 ? (
          <Muted>Sin citas próximas.</Muted>
        ) : (
          upcoming.map((c) => (
            <Text
              key={String(c.id_cita)}
              className="font-sans text-[14px] text-ink"
            >
              {formatDateTime(c.inicio)} · {ESTADO_CITA[c.estado]}
            </Text>
          ))
        )}
        {past.length > 0 ? (
          <>
            <Muted>Anteriores</Muted>
            {past.map((c) => (
              <Text
                key={String(c.id_cita)}
                className="font-sans text-[14px] text-muted"
              >
                {formatDateTime(c.inicio)} · {ESTADO_CITA[c.estado]}
              </Text>
            ))}
          </>
        ) : null}
      </View>

      {/* Evaluaciones */}
      <View className="gap-2">
        <Text className="font-sans text-sm font-semibold text-ink">
          Evaluaciones recientes
        </Text>
        {evals === null ? (
          <Muted>Cargando…</Muted>
        ) : evalError ? (
          <Text className="font-sans text-sm text-danger">{evalError}</Text>
        ) : evals.length === 0 ? (
          <Muted>Este paciente aún no tiene evaluaciones.</Muted>
        ) : (
          evals.slice(0, 3).map((e) => (
            <View
              key={String(e.id_evaluacion)}
              className={cn(
                "gap-1 rounded-nf-sm border p-2.5",
                Number(e.alerta_prioritaria) === 1
                  ? "border-danger bg-red-50"
                  : "border-border",
              )}
            >
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="font-sans text-[13px] text-ink">
                  {formatDateTime(e.fecha_inicio)}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {Number(e.alerta_prioritaria) === 1 ? (
                    <Pill text="Alerta prioritaria" tone="danger" />
                  ) : null}
                  {e.requiere_revision ? (
                    <Pill text="Por revisar" tone="warn" />
                  ) : null}
                  <Pill
                    text={ESTADO_EVAL[e.estado]}
                    tone={e.estado === 2 ? "ok" : "muted"}
                  />
                </View>
              </View>
              <Text className="font-sans text-[13px] text-ink">
                {PSS14.corto}: {e.pss14_puntaje ?? "—"}/{PSS14.puntajeMax} ·{" "}
                {GAD7.corto}: {e.gad7_puntaje ?? "—"}/{GAD7.puntajeMax}
                {e.gad7_nivel != null
                  ? ` (${GAD7.niveles[e.gad7_nivel]})`
                  : ""}{" "}
                · {PHQ9.corto}: {e.phq9_puntaje ?? "—"}/{PHQ9.puntajeMax}
                {e.phq9_nivel != null ? ` (${PHQ9.niveles[e.phq9_nivel]})` : ""}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Expediente */}
      <View className="gap-2">
        <Text className="font-sans text-sm font-semibold text-ink">
          Expediente
        </Text>
        {p.id_expediente ? (
          <>
            <Muted>
              Estado:{" "}
              {p.estado_expediente ? ESTADO_EXP[p.estado_expediente] : "—"}
            </Muted>
            <View className="flex-row">
              <Button
                title="Abrir en expedientes"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/psychologist/records",
                    params: { paciente: String(p.id_paciente) },
                  })
                }
              />
            </View>
          </>
        ) : (
          <>
            <Muted>Este paciente aún no tiene expediente.</Muted>
            <CreateRecord patient={p} onCreated={onChanged} />
          </>
        )}
      </View>

      {/* Accesos */}
      <View className="flex-row flex-wrap gap-2">
        <Button
          title="Ir a la agenda"
          variant="secondary"
          onPress={() => router.push("/(app)/psychologist/agenda")}
        />
        <Button
          title="Ver evaluaciones"
          variant="secondary"
          onPress={() => router.push("/(app)/psychologist/evaluations")}
        />
        <Button
          title="Chat"
          variant="secondary"
          onPress={() => router.push("/(app)/psychologist/chat")}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta                                                             */
/* ------------------------------------------------------------------ */
function PatientCard({
  p,
  citas,
  onChanged,
}: {
  p: Row;
  citas: Appointment[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const noEval = staleEvaluation(p);

  return (
    <Card className="gap-3">
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((v) => !v)}
        className="gap-2"
      >
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="font-sans text-base font-semibold text-ink">
            {p.paciente}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {p.es_principal === false ? (
              <Pill text="Asignación secundaria" tone="muted" />
            ) : null}
            <Pill
              text={
                p.id_expediente && p.estado_expediente
                  ? `Expediente ${ESTADO_EXP[p.estado_expediente].toLowerCase()}`
                  : "Sin expediente"
              }
              tone={
                p.estado_expediente === 1
                  ? "ok"
                  : p.id_expediente
                    ? "muted"
                    : "warn"
              }
            />
          </View>
        </View>
        <Muted>
          {p.num_control_o_num_empleado
            ? `${p.num_control_o_num_empleado} · `
            : ""}
          {tipoLabel(p.tipo_persona)}
          {p.correo ? ` · ${p.correo}` : ""}
        </Muted>
        <Muted>Con tu seguimiento desde {formatDateTime(p.fecha_inicio)}</Muted>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          <Text className="font-sans text-[13px] text-ink">
            Próxima cita:{" "}
            <Text
              className={cn(
                "font-semibold",
                !p.proxima_cita && "text-amber-800",
              )}
            >
              {p.proxima_cita ? formatDateTime(p.proxima_cita) : "Sin cita"}
            </Text>
          </Text>
          <Text className="font-sans text-[13px] text-ink">
            Última evaluación:{" "}
            <Text className={cn("font-semibold", noEval && "text-amber-800")}>
              {p.fecha_ultima_evaluacion
                ? formatDateTime(p.fecha_ultima_evaluacion)
                : "Ninguna"}
            </Text>
          </Text>
        </View>
        {!open ? <Muted>Toca para ver el detalle</Muted> : null}
      </Pressable>

      {open ? (
        <PatientDetail p={p} citas={citas} onChanged={onChanged} />
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Patients() {
  const { user } = useAuth();
  const id = user!.userId;

  const q = useLoad(async () => {
    const [dash, assigned, citas] = await Promise.all([
      psychologistsApi.dashboardPatients(id),
      (assignmentsApi.patients(id) as Promise<AssignedPatient[]>).catch(
        () => [] as AssignedPatient[],
      ),
      appointmentsApi.byPsychologist(id).catch(() => [] as Appointment[]),
    ]);
    const extra = new Map(assigned.map((a) => [a.id_paciente, a]));
    const rows: Row[] = dash.map((d) => {
      const a = extra.get(d.id_paciente);
      return {
        ...d,
        correo: a?.correo,
        num_control_o_num_empleado: a?.num_control_o_num_empleado,
        es_principal: a ? Boolean(a.es_principal) : undefined,
      };
    });
    return { rows, citas };
  }, [id]);

  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");

  if (q.loading && !q.data) return <Loading />;

  const all = q.data?.rows ?? [];
  const citas = q.data?.citas ?? [];

  const counts = {
    todos: all.length,
    sin_cita: all.filter((p) => !p.proxima_cita).length,
    sin_expediente: all.filter((p) => !p.id_expediente).length,
    sin_evaluacion: all.filter(staleEvaluation).length,
  };

  const list = all
    .filter((p) =>
      filter === "sin_cita"
        ? !p.proxima_cita
        : filter === "sin_expediente"
          ? !p.id_expediente
          : filter === "sin_evaluacion"
            ? staleEvaluation(p)
            : true,
    )
    .filter((p) =>
      `${p.paciente} ${p.num_control_o_num_empleado ?? ""} ${p.correo ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    );

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[760px] gap-5">
          <View className="gap-1">
            <H1>Pacientes</H1>
            <Muted>Asignaciones activas y seguimiento.</Muted>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <Stat label="Pacientes activos" value={String(counts.todos)} />
            <Stat label="Sin próxima cita" value={String(counts.sin_cita)} />
            <Stat
              label="Sin expediente"
              value={String(counts.sin_expediente)}
            />
          </View>

          <View className="gap-3">
            <Choice
              value={filter}
              onChange={setFilter}
              options={[
                { value: "todos" as Filter, label: `Todos (${counts.todos})` },
                {
                  value: "sin_cita" as Filter,
                  label: `Sin próxima cita (${counts.sin_cita})`,
                },
                {
                  value: "sin_expediente" as Filter,
                  label: `Sin expediente (${counts.sin_expediente})`,
                },
                {
                  value: "sin_evaluacion" as Filter,
                  label: `Sin evaluación en 30 días (${counts.sin_evaluacion})`,
                },
              ]}
            />
            <Input
              placeholder="Buscar por nombre, número de control o correo"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          {q.error ? (
            <Text className="font-sans text-sm text-danger">{q.error}</Text>
          ) : null}

          {list.length === 0 ? (
            <EmptyState
              message={
                all.length === 0
                  ? "Aún no tienes pacientes asignados."
                  : "No hay pacientes con estos filtros."
              }
            />
          ) : (
            list.map((p) => (
              <PatientCard
                key={p.id_paciente}
                p={p}
                citas={citas}
                onChanged={() => void q.reload()}
              />
            ))
          )}
        </View>
      </Screen>
    </>
  );
}
