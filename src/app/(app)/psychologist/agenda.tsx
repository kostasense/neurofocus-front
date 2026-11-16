import { appointmentsApi } from "@/api/appointments";
import { psychologistsApi } from "@/api/psychologists";
import { SchedulesTab } from "@/components/agenda/schedules-tab";
import { SlotPicker, slotLabel } from "@/components/agenda/slot-picker";
import { EmptyState } from "@/components/feedback/empty-state";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H1, H2, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import {
  dayKey,
  startOfMonth,
  type Schedule,
  type Slot,
} from "@/lib/availability";
import { cn } from "@/lib/cn";
import { confirmAsync } from "@/lib/confirm";
import { formatDateTime } from "@/lib/format";
import type { Appointment, DashboardPatient, Psychologist } from "@/types/api";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Catálogos y utilidades                                              */
/* ------------------------------------------------------------------ */
const ESTADO: Record<number, string> = {
  1: "Solicitada",
  2: "Confirmada",
  3: "Realizada",
  4: "Cancelada",
  5: "No asistió",
  6: "Reprogramada",
};
const MODALIDAD: Record<number, string> = { 1: "Presencial", 2: "Virtual" };
const TIPO: Record<string, string> = {
  A: "Alumno",
  D: "Docente",
  PA: "Personal administrativo",
};

type RangeKey = "hoy" | "semana" | "mes" | "pasadas" | "todas";
const RANGOS: { value: RangeKey; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Próximos 7 días" },
  { value: "mes", label: "Este mes" },
  { value: "pasadas", label: "Últimos 30 días" },
  { value: "todas", label: "Todas" },
];

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

const DAY_MS = 86_400_000;
function rangeParams(r: RangeKey): { from?: string; to?: string } {
  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (r) {
    case "hoy":
      return {
        from: sod.toISOString(),
        to: new Date(+sod + DAY_MS).toISOString(),
      };
    case "semana":
      return {
        from: sod.toISOString(),
        to: new Date(+sod + 7 * DAY_MS).toISOString(),
      };
    case "mes":
      return {
        from: startOfMonth(now).toISOString(),
        to: startOfMonth(now, 1).toISOString(),
      };
    case "pasadas":
      return {
        from: new Date(+sod - 30 * DAY_MS).toISOString(),
        to: now.toISOString(),
      };
    default:
      return {};
  }
}

const dayHeader = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
const hourLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(
    new Date(iso),
  );

const isActive = (c: Appointment) => c.estado === 1 || c.estado === 2;

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

function Pill({ text, tone }: { text: string; tone: "ok" | "muted" | "warn" }) {
  return (
    <Text
      className={cn(
        "rounded-nf-sm px-2 py-0.5 font-sans text-xs",
        tone === "ok" && "bg-primary-light text-primary-dark",
        tone === "warn" && "bg-amber-100 text-amber-800",
        tone === "muted" && "bg-border text-muted",
      )}
    >
      {text}
    </Text>
  );
}
const tone = (estado: number) =>
  estado === 2 || estado === 3 ? "ok" : estado === 1 ? "warn" : "muted";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="min-w-[150px] flex-1 gap-1">
      <Muted>{label}</Muted>
      <Text className="font-sans text-xl font-semibold text-ink">{value}</Text>
      {hint ? <Muted>{hint}</Muted> : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Reprogramar                                                         */
/* ------------------------------------------------------------------ */
function ReschedulePanel({
  cita,
  psy,
  schedules,
  onClose,
  onDone,
}: {
  cita: Appointment;
  psy: Psychologist;
  schedules: Schedule[];
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!slot) return;
    if (
      slot.start.getTime() === new Date(cita.inicio).getTime() &&
      slot.end.getTime() === new Date(cita.fin).getTime()
    )
      return setError("Elige un horario distinto al actual.");
    setBusy(true);
    setError("");
    try {
      await appointmentsApi.reschedule(Number(cita.id_cita), {
        inicio: slot.start.toISOString(),
        fin: slot.end.toISOString(),
        modalidad: slot.modalidad,
      });
      onDone("La cita fue reprogramada.");
    } catch (e) {
      setError(errMsg(e, "No fue posible reprogramar la cita"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-4 rounded-nf-sm border border-primary p-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-sans text-base font-semibold text-ink">
          Reprogramar cita
        </Text>
        <Button title="Cerrar" variant="secondary" onPress={onClose} />
      </View>
      <Muted>
        Horario actual: {formatDateTime(cita.inicio)}. Elige un horario
        distinto; la cita actual quedará como reprogramada.
      </Muted>
      <SlotPicker
        psychologistId={psy.id_psicologo}
        schedules={schedules}
        duracionMin={psy.duracion_cita_minutos}
        current={{ inicio: cita.inicio, fin: cita.fin }}
        value={slot}
        onChange={setSlot}
      />
      {slot ? (
        <View className="gap-3 rounded-nf-sm border border-border p-3">
          <Text className="font-sans text-[15px] capitalize text-ink">
            {slotLabel(slot)} · {MODALIDAD[slot.modalidad]}
          </Text>
          <Button
            title="Confirmar reprogramación"
            loading={busy}
            onPress={() => void confirm()}
          />
        </View>
      ) : null}
      {error ? (
        <Text className="font-sans text-sm text-danger">{error}</Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Nueva cita                                                          */
/* ------------------------------------------------------------------ */
function NewAppointmentPanel({
  psy,
  schedules,
  onClose,
  onDone,
}: {
  psy: Psychologist;
  schedules: Schedule[];
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const patients = useLoad<DashboardPatient[]>(
    () => psychologistsApi.dashboardPatients(psy.id_psicologo),
    [psy.id_psicologo],
  );
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const list = (patients.data ?? []).filter((p) =>
    p.paciente.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const chosen = (patients.data ?? []).find((p) => p.id_paciente === patientId);

  const create = async () => {
    if (!patientId) return setError("Elige un paciente.");
    if (!slot) return setError("Elige un horario.");
    setBusy(true);
    setError("");
    try {
      await appointmentsApi.create({
        idPaciente: patientId,
        idPsicologo: psy.id_psicologo,
        inicio: slot.start.toISOString(),
        fin: slot.end.toISOString(),
        modalidad: slot.modalidad,
        ...(notas.trim() ? { notasAgenda: notas.trim() } : {}),
      });
      onDone("La cita fue creada y quedó confirmada.");
    } catch (e) {
      setError(errMsg(e, "No fue posible crear la cita"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-4">
      <View className="flex-row items-center justify-between gap-2">
        <H2>Nueva cita</H2>
        <Button title="Cerrar" variant="secondary" onPress={onClose} />
      </View>

      <View className="gap-2">
        <Text className="font-sans text-sm font-medium text-ink">Paciente</Text>
        {patients.loading ? (
          <Muted>Cargando pacientes…</Muted>
        ) : (patients.data ?? []).length === 0 ? (
          <Muted>No tienes pacientes asignados todavía.</Muted>
        ) : (
          <>
            <Input
              placeholder="Buscar paciente"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            <Choice
              value={patientId}
              onChange={setPatientId}
              options={list.slice(0, 12).map((p) => ({
                value: p.id_paciente,
                label: p.paciente,
              }))}
            />
            {list.length > 12 ? (
              <Muted>Mostrando 12; afina la búsqueda.</Muted>
            ) : null}
          </>
        )}
        {patients.error ? (
          <Text className="font-sans text-sm text-danger">
            {patients.error}
          </Text>
        ) : null}
      </View>

      <SlotPicker
        psychologistId={psy.id_psicologo}
        schedules={schedules}
        duracionMin={psy.duracion_cita_minutos}
        value={slot}
        onChange={setSlot}
      />

      {slot ? (
        <View className="gap-3 rounded-nf-sm border border-border p-3">
          <Text className="font-sans text-[15px] text-ink">
            <Text className="font-semibold">
              {chosen?.paciente ?? "Sin paciente"}
            </Text>
            {" · "}
            <Text className="capitalize">{slotLabel(slot)}</Text> ·{" "}
            {MODALIDAD[slot.modalidad]}
          </Text>
          <Input
            label="Nota para la agenda (opcional)"
            value={notas}
            onChangeText={setNotas}
            maxLength={500}
            placeholder="Sin información clínica"
          />
          <Button
            title="Crear cita confirmada"
            loading={busy}
            onPress={() => void create()}
          />
        </View>
      ) : null}
      {error ? (
        <Text className="font-sans text-sm text-danger">{error}</Text>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de cita                                                     */
/* ------------------------------------------------------------------ */
function CitaCard({
  c,
  psy,
  schedules,
  rescheduling,
  onReschedule,
  onCloseReschedule,
  onRescheduled,
  onChanged,
  onMessage,
}: {
  c: Appointment;
  psy: Psychologist;
  schedules: Schedule[];
  rescheduling: boolean;
  onReschedule: (c: Appointment) => void;
  onCloseReschedule: () => void;
  onRescheduled: (m: string) => void;
  onChanged: () => void;
  onMessage: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [detailError, setDetailError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const started = new Date(c.inicio).getTime() <= Date.now();

  useEffect(() => {
    if (!open || detail) return;
    let alive = true;
    appointmentsApi
      .get(Number(c.id_cita))
      .then((d) => alive && setDetail(d))
      .catch(
        (e) =>
          alive && setDetailError(errMsg(e, "No se pudo cargar el detalle")),
      );
    return () => {
      alive = false;
    };
  }, [open]);

  const setStatus = async (estado: 2 | 3 | 5, msg: string) => {
    setBusy(`s${estado}`);
    setError("");
    try {
      await appointmentsApi.status(Number(c.id_cita), estado);
      onMessage(msg);
      onChanged();
    } catch (e) {
      setError(errMsg(e, "No fue posible actualizar la cita"));
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!motivo.trim()) return setError("Indica el motivo de la cancelación.");
    const ok = await confirmAsync(
      "Cancelar cita",
      `¿Cancelar la cita de ${c.paciente ?? "el paciente"} del ${formatDateTime(c.inicio)}?`,
      "Cancelar cita",
      "Volver",
    );
    if (!ok) return;
    setBusy("cancel");
    setError("");
    try {
      await appointmentsApi.cancel(Number(c.id_cita), motivo.trim());
      onMessage("La cita fue cancelada.");
      onChanged();
    } catch (e) {
      setError(errMsg(e, "No fue posible cancelar la cita"));
    } finally {
      setBusy(null);
    }
  };

  const d = detail ?? c;
  const creadaPor =
    d.creada_por == null
      ? null
      : d.creada_por === c.id_paciente
        ? "el paciente"
        : "el psicólogo o administración";

  return (
    <Card className="gap-2">
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((v) => !v)}
        className="gap-1"
      >
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="font-sans font-semibold text-ink">
            {hourLabel(c.inicio)} – {hourLabel(c.fin)} ·{" "}
            {c.paciente ?? `Paciente #${c.id_paciente}`}
          </Text>
          <Pill text={ESTADO[c.estado]} tone={tone(c.estado)} />
        </View>
        <Muted>
          {MODALIDAD[c.modalidad]}
          {c.num_control_o_num_empleado
            ? ` · ${c.num_control_o_num_empleado}`
            : ""}
          {c.tipo_persona
            ? ` · ${TIPO[c.tipo_persona.trim()] ?? c.tipo_persona.trim()}`
            : ""}
          {open ? "" : " · Toca para ver detalle"}
        </Muted>
      </Pressable>

      {open ? (
        <View className="gap-1 rounded-nf-sm bg-background p-3">
          {detailError ? (
            <Text className="font-sans text-sm text-danger">{detailError}</Text>
          ) : null}
          <Muted>Inicio: {formatDateTime(d.inicio)}</Muted>
          <Muted>Fin: {formatDateTime(d.fin)}</Muted>
          {d.fecha_creacion ? (
            <Muted>
              Creada el {formatDateTime(d.fecha_creacion)}
              {creadaPor ? ` por ${creadaPor}` : ""}
            </Muted>
          ) : null}
          {d.id_evaluacion ? (
            <Muted>Evaluación relacionada #{String(d.id_evaluacion)}</Muted>
          ) : null}
          {d.notas_agenda ? <Muted>Nota: {d.notas_agenda}</Muted> : null}
          {d.motivo_cancelacion ? (
            <Muted>Motivo de cancelación: {d.motivo_cancelacion}</Muted>
          ) : null}
        </View>
      ) : null}

      {/* Acciones */}
      {!cancelling && !rescheduling && c.estado !== 4 && c.estado !== 6 ? (
        <View className="flex-row flex-wrap gap-2 pt-1">
          {c.estado === 1 ? (
            <Button
              title="Confirmar"
              variant="success"
              loading={busy === "s2"}
              onPress={() => void setStatus(2, "La cita fue confirmada.")}
            />
          ) : null}
          {(c.estado === 1 || c.estado === 2) && started ? (
            <>
              <Button
                title="Marcar realizada"
                loading={busy === "s3"}
                onPress={() =>
                  void setStatus(3, "La cita se marcó como realizada.")
                }
              />
              <Button
                title="No asistió"
                variant="secondary"
                loading={busy === "s5"}
                onPress={() =>
                  void setStatus(5, "Se registró que el paciente no asistió.")
                }
              />
            </>
          ) : null}
          {c.estado === 3 ? (
            <Button
              title="Corregir: no asistió"
              variant="secondary"
              loading={busy === "s5"}
              onPress={() =>
                void setStatus(5, "Se registró que el paciente no asistió.")
              }
            />
          ) : null}
          {c.estado === 5 ? (
            <Button
              title="Corregir: realizada"
              variant="secondary"
              loading={busy === "s3"}
              onPress={() =>
                void setStatus(3, "La cita se marcó como realizada.")
              }
            />
          ) : null}
          {isActive(c) ? (
            <>
              <Button
                title="Reprogramar"
                variant="secondary"
                onPress={() => onReschedule(c)}
              />
              <Button
                title="Cancelar"
                variant="danger"
                onPress={() => setCancelling(true)}
              />
            </>
          ) : null}
        </View>
      ) : null}
      {isActive(c) && !started ? (
        <Muted>
          Podrás marcarla como realizada o no asistida cuando llegue su hora.
        </Muted>
      ) : null}

      {rescheduling ? (
        <ReschedulePanel
          cita={c}
          psy={psy}
          schedules={schedules}
          onClose={onCloseReschedule}
          onDone={onRescheduled}
        />
      ) : null}

      {cancelling ? (
        <View className="gap-2 pt-1">
          <Input
            label="Motivo de la cancelación"
            value={motivo}
            onChangeText={setMotivo}
            maxLength={250}
          />
          <View className="flex-row flex-wrap gap-2">
            <Button
              title="Confirmar cancelación"
              variant="danger"
              loading={busy === "cancel"}
              onPress={() => void cancel()}
            />
            <Button
              title="Volver"
              variant="secondary"
              onPress={() => {
                setCancelling(false);
                setError("");
              }}
            />
          </View>
        </View>
      ) : null}
      {error ? (
        <Text className="font-sans text-sm text-danger">{error}</Text>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pestaña de citas                                                    */
/* ------------------------------------------------------------------ */
function CitasTab({
  psy,
  schedules,
}: {
  psy: Psychologist;
  schedules: Schedule[];
}) {
  const id = psy.id_psicologo;
  const [range, setRange] = useState<RangeKey>("semana");
  const [estado, setEstado] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [panel, setPanel] = useState<"none" | "new">("none");
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);

  // Resumen de los próximos 7 días (vista del dashboard del backend).
  const dash = useLoad<Appointment[]>(() => {
    const now = new Date();
    return appointmentsApi.dashboard(
      id,
      now.toISOString(),
      new Date(+now + 7 * DAY_MS).toISOString(),
    );
  }, [id]);

  const list = useLoad<Appointment[]>(() => {
    const { from, to } = rangeParams(range);
    return appointmentsApi.byPsychologist(id, from, to);
  }, [id, range]);

  const refresh = () => {
    void list.reload();
    void dash.reload();
  };

  const upcoming = (dash.data ?? [])
    .filter((c) => isActive(c) && new Date(c.inicio).getTime() > Date.now())
    .sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio));
  const todayKey = dayKey(new Date());
  const hoy = (dash.data ?? []).filter(
    (c) => isActive(c) && dayKey(new Date(c.inicio)) === todayKey,
  ).length;
  const porConfirmar = (dash.data ?? []).filter((c) => c.estado === 1).length;
  const next = upcoming[0];

  const all = list.data ?? [];
  const counts = (e: number) =>
    e === 0 ? all.length : all.filter((c) => c.estado === e).length;
  const shown = all.filter((c) => estado === 0 || c.estado === estado);

  // Agrupar por día local; "pasadas" se muestra de lo más reciente a lo más antiguo.
  const sorted = [...shown].sort((a, b) =>
    range === "pasadas"
      ? +new Date(b.inicio) - +new Date(a.inicio)
      : +new Date(a.inicio) - +new Date(b.inicio),
  );
  const groups: { key: string; date: Date; items: Appointment[] }[] = [];
  for (const c of sorted) {
    const date = new Date(c.inicio);
    const key = dayKey(date);
    const g = groups[groups.length - 1];
    if (g && g.key === key) g.items.push(c);
    else groups.push({ key, date, items: [c] });
  }

  const done = (m: string) => {
    setMessage(m);
    setPanel("none");
    setRescheduling(null);
    refresh();
  };

  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap gap-3">
        <Stat label="Citas hoy" value={String(hoy)} />
        <Stat label="Por confirmar (7 días)" value={String(porConfirmar)} />
        <Stat
          label="Próxima cita"
          value={next ? formatDateTime(next.inicio) : "Sin citas"}
          hint={next?.paciente}
        />
      </View>
      {dash.error ? (
        <Text className="font-sans text-sm text-danger">{dash.error}</Text>
      ) : null}

      {message ? (
        <Text className="rounded-nf-sm bg-primary-light p-3 font-sans text-sm text-primary-dark">
          {message}
        </Text>
      ) : null}

      {panel === "new" ? (
        <NewAppointmentPanel
          psy={psy}
          schedules={schedules}
          onClose={() => setPanel("none")}
          onDone={done}
        />
      ) : (
        <View className="flex-row">
          <Button
            title="Nueva cita"
            onPress={() => {
              setMessage("");
              setPanel("new");
            }}
          />
        </View>
      )}

      <View className="gap-3">
        <Choice value={range} onChange={setRange} options={RANGOS} />
        <Choice
          value={estado}
          onChange={setEstado}
          options={[
            { value: 0, label: `Todas (${counts(0)})` },
            ...[1, 2, 3, 4, 5, 6].map((e) => ({
              value: e,
              label: `${ESTADO[e]} (${counts(e)})`,
            })),
          ]}
        />
      </View>

      {list.error ? (
        <Text className="font-sans text-sm text-danger">{list.error}</Text>
      ) : null}
      {list.loading && !list.data ? (
        <Loading />
      ) : groups.length === 0 ? (
        <EmptyState message="No hay citas con estos filtros." />
      ) : (
        groups.map((g) => (
          <View key={g.key} className="gap-2">
            <Text className="font-sans text-sm font-semibold capitalize text-muted">
              {dayHeader(g.date)}
            </Text>
            {g.items.map((c) => (
              <CitaCard
                key={String(c.id_cita)}
                c={c}
                psy={psy}
                schedules={schedules}
                rescheduling={rescheduling?.id_cita === c.id_cita}
                onReschedule={(x) => {
                  setMessage("");
                  setPanel("none");
                  setRescheduling(x);
                }}
                onCloseReschedule={() => setRescheduling(null)}
                onRescheduled={done}
                onChanged={refresh}
                onMessage={setMessage}
              />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Agenda() {
  const { user } = useAuth();
  const id = user!.userId;

  const profile = useLoad<Psychologist>(
    () => psychologistsApi.get(id) as Promise<Psychologist>,
    [id],
  );
  const schedules = useLoad<Schedule[]>(
    () => appointmentsApi.schedules(id, true),
    [id],
  );
  const [tab, setTab] = useState<"citas" | "horarios">("citas");

  if (
    (profile.loading && !profile.data) ||
    (schedules.loading && !schedules.data)
  )
    return <Loading />;

  const psy = profile.data;

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[760px] gap-5">
          <View className="gap-1">
            <H1>Agenda</H1>
            <Muted>Citas, estado de atención y bloques de horario.</Muted>
          </View>

          {profile.error || schedules.error ? (
            <Text className="font-sans text-sm text-danger">
              {profile.error || schedules.error}
            </Text>
          ) : null}

          {psy ? (
            <>
              <Choice
                value={tab}
                onChange={setTab}
                options={[
                  { value: "citas" as const, label: "Citas" },
                  { value: "horarios" as const, label: "Horarios" },
                ]}
              />
              {!psy.activo_para_citas ? (
                <Muted>
                  Tu perfil no recibe citas nuevas de pacientes; puedes
                  cambiarlo con administración.
                </Muted>
              ) : null}
              {tab === "citas" ? (
                <CitasTab psy={psy} schedules={schedules.data ?? []} />
              ) : (
                <SchedulesTab
                  psychologistId={psy.id_psicologo}
                  schedules={schedules.data ?? []}
                  duracionMin={psy.duracion_cita_minutos}
                  onChanged={() => void schedules.reload()}
                />
              )}
            </>
          ) : null}
        </View>
      </Screen>
    </>
  );
}
