import { appointmentsApi } from "@/api/appointments";
import { psychologistsApi } from "@/api/psychologists";
import { EmptyState } from "@/components/feedback/empty-state";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H1, Muted } from "@/components/ui/typography";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { Appointment, DashboardPatient, Psychologist } from "@/types/api";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Tipos y catálogos                                                   */
/* ------------------------------------------------------------------ */
type Schedule = {
  id_horario: number;
  id_psicologo: number;
  dia_semana: number; // 1 lunes ... 7 domingo
  hora_inicio: string; // TIME: llega como "1970-01-01T08:00:00.000Z" o "08:00:00"
  hora_fin: string;
  modalidad: 1 | 2;
  activo: boolean;
};

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const MODALIDAD: Record<number, string> = { 1: "Presencial", 2: "Virtual" };
const ESTADO_CITA: Record<number, string> = {
  1: "Solicitada",
  2: "Confirmada",
  3: "Realizada",
  4: "Cancelada",
  5: "No asistió",
  6: "Reprogramada",
};
const ESTADO_EXP: Record<number, string> = {
  1: "Activo",
  2: "Cerrado",
  3: "Archivado",
};
const TIPO: Record<string, string> = {
  A: "Alumno",
  D: "Docente",
  PA: "Personal administrativo",
};

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Extrae HH:mm de un TIME serializado por el backend. */
const hhmm = (v: string) =>
  /^\d{4}-/.test(v) ? v.slice(11, 16) : v.slice(0, 5);

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

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

function Badge({ text, ok }: { text: string; ok: boolean }) {
  return (
    <Text
      className={cn(
        "rounded-nf-sm px-2 py-0.5 font-sans text-xs",
        ok ? "bg-primary-light text-primary-dark" : "bg-border text-muted",
      )}
    >
      {text}
    </Text>
  );
}

function Feedback({ error, ok }: { error?: string; ok?: string }) {
  if (error)
    return <Text className="font-sans text-sm text-danger">{error}</Text>;
  if (ok) return <Text className="font-sans text-sm text-success">{ok}</Text>;
  return null;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="min-w-[110px] flex-1 rounded-nf-sm border border-border p-3">
      <Text className="font-serif text-2xl text-ink">{value}</Text>
      <Text className="font-sans text-xs text-muted">{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pestaña: Perfil profesional                                         */
/* ------------------------------------------------------------------ */
function ProfileTab({
  p,
  onChanged,
}: {
  p: Psychologist;
  onChanged: () => void;
}) {
  const [cedula, setCedula] = useState(p.cedula_profesional ?? "");
  const [esp, setEsp] = useState(p.especialidad ?? "");
  const [dur, setDur] = useState(String(p.duracion_cita_minutos));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    setError("");
    setOk("");
    try {
      await fn();
      setOk(msg);
      onChanged();
    } catch (e) {
      setError(errMsg(e, "No se pudo guardar el cambio"));
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    const minutos = Number(dur);
    if (!cedula.trim())
      return setError("La cédula profesional es obligatoria.");
    if (!Number.isInteger(minutos) || minutos < 10 || minutos > 240)
      return setError("La duración debe ser un entero entre 10 y 240 minutos.");
    // El backend no acepta especialidad vacía (1 a 120 caracteres).
    const dto: Record<string, unknown> = {
      cedulaProfesional: cedula.trim(),
      duracionCitaMinutos: minutos,
    };
    if (esp.trim()) dto.especialidad = esp.trim();
    void run(
      "save",
      () => psychologistsApi.update(p.id_psicologo, dto),
      "Perfil actualizado.",
    );
  };

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="font-sans text-sm text-muted">Correo</Text>
        <Text className="font-sans text-[15px] text-ink">{p.correo}</Text>
      </View>

      <Input
        label="Cédula profesional"
        value={cedula}
        onChangeText={setCedula}
        maxLength={30}
      />
      <Input
        label="Especialidad"
        value={esp}
        onChangeText={setEsp}
        maxLength={120}
        placeholder="Psicología clínica"
      />
      <Input
        label="Duración predeterminada de cita (minutos)"
        value={dur}
        onChangeText={setDur}
        keyboardType="number-pad"
      />
      <Button title="Guardar perfil" loading={busy === "save"} onPress={save} />

      <View className="gap-3 border-t border-border pt-4">
        <Text className="font-sans text-sm font-semibold text-ink">
          Disponibilidad
        </Text>
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="font-sans text-sm text-ink">Recibir citas</Text>
            <Muted>
              {p.activo_para_citas
                ? "Los pacientes pueden agendar con este psicólogo."
                : "No aparece al agendar nuevas citas."}
            </Muted>
          </View>
          <Button
            title={p.activo_para_citas ? "Desactivar" : "Activar"}
            variant={p.activo_para_citas ? "secondary" : "success"}
            loading={busy === "cita"}
            onPress={() =>
              void run(
                "cita",
                () =>
                  psychologistsApi.setAppointments(
                    p.id_psicologo,
                    !p.activo_para_citas,
                  ),
                p.activo_para_citas
                  ? "Ya no recibe citas nuevas."
                  : "Ahora recibe citas.",
              )
            }
          />
        </View>
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="font-sans text-sm text-ink">Chat disponible</Text>
            <Muted>
              {p.chat_disponible
                ? "Puede habilitar el chat con sus pacientes."
                : "El chat está desactivado de forma global."}
            </Muted>
          </View>
          <Button
            title={p.chat_disponible ? "Desactivar" : "Activar"}
            variant={p.chat_disponible ? "secondary" : "success"}
            loading={busy === "chat"}
            onPress={() =>
              void run(
                "chat",
                () =>
                  psychologistsApi.setChat(p.id_psicologo, !p.chat_disponible),
                p.chat_disponible ? "Chat desactivado." : "Chat activado.",
              )
            }
          />
        </View>
      </View>

      <Feedback error={error} ok={ok} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pestaña: Horarios                                                   */
/* ------------------------------------------------------------------ */
function ScheduleForm({
  initial,
  psychologistId,
  onDone,
  onCancel,
}: {
  initial?: Schedule;
  psychologistId: number;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [dia, setDia] = useState<number>(initial?.dia_semana ?? 1);
  const [ini, setIni] = useState(initial ? hhmm(initial.hora_inicio) : "08:00");
  const [fin, setFin] = useState(initial ? hhmm(initial.hora_fin) : "14:00");
  const [mod, setMod] = useState<number>(initial?.modalidad ?? 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!HORA_RE.test(ini) || !HORA_RE.test(fin))
      return setError("Usa el formato HH:mm de 24 horas, por ejemplo 08:00.");
    if (fin <= ini)
      return setError("La hora de fin debe ser posterior a la de inicio.");
    setBusy(true);
    setError("");
    const dto = {
      diaSemana: dia,
      horaInicio: ini,
      horaFin: fin,
      modalidad: mod,
    };
    try {
      if (initial)
        await appointmentsApi.updateSchedule(initial.id_horario, dto);
      else await appointmentsApi.createSchedule(psychologistId, dto);
      onDone();
    } catch (e) {
      setError(errMsg(e, "No se pudo guardar el horario"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-3 rounded-nf-sm border border-border p-3">
      <Text className="font-sans text-sm font-semibold text-ink">
        {initial ? "Editar bloque" : "Nuevo bloque semanal"}
      </Text>
      <Choice
        value={dia}
        onChange={setDia}
        options={DIAS.map((label, i) => ({ value: i + 1, label }))}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Inicio (HH:mm)"
            value={ini}
            onChangeText={setIni}
            maxLength={5}
            autoCapitalize="none"
          />
        </View>
        <View className="flex-1">
          <Input
            label="Fin (HH:mm)"
            value={fin}
            onChangeText={setFin}
            maxLength={5}
            autoCapitalize="none"
          />
        </View>
      </View>
      <Choice
        value={mod}
        onChange={setMod}
        options={[
          { value: 1, label: "Presencial" },
          { value: 2, label: "Virtual" },
        ]}
      />
      <Feedback error={error} />
      <View className="flex-row gap-2">
        <Button
          title={initial ? "Guardar cambios" : "Agregar bloque"}
          loading={busy}
          onPress={() => void submit()}
        />
        {onCancel ? (
          <Button title="Cancelar" variant="secondary" onPress={onCancel} />
        ) : null}
      </View>
    </View>
  );
}

function SchedulesTab({ p }: { p: Psychologist }) {
  const q = useLoad<Schedule[]>(
    () =>
      appointmentsApi.schedules(p.id_psicologo, true) as Promise<Schedule[]>,
    [p.id_psicologo],
  );
  const [editing, setEditing] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  if (q.loading && !q.data) return <Loading />;

  const all = q.data ?? [];
  const visible = all.filter((s) => s.activo || showInactive);
  const activos = all.filter((s) => s.activo);
  const minutos = activos.reduce((t, s) => {
    const [h1, m1] = hhmm(s.hora_inicio).split(":").map(Number);
    const [h2, m2] = hhmm(s.hora_fin).split(":").map(Number);
    return t + (h2 * 60 + m2 - (h1 * 60 + m1));
  }, 0);
  const slots = activos.reduce((t, s) => {
    const [h1, m1] = hhmm(s.hora_inicio).split(":").map(Number);
    const [h2, m2] = hhmm(s.hora_fin).split(":").map(Number);
    return (
      t + Math.floor((h2 * 60 + m2 - (h1 * 60 + m1)) / p.duracion_cita_minutos)
    );
  }, 0);

  const toggle = async (s: Schedule) => {
    setBusy(s.id_horario);
    setError("");
    try {
      if (s.activo) await appointmentsApi.deactivateSchedule(s.id_horario);
      else await appointmentsApi.updateSchedule(s.id_horario, { activo: true });
      await q.reload();
    } catch (e) {
      setError(errMsg(e, "No se pudo cambiar el estado del bloque"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-3">
        <Stat label="Bloques activos" value={activos.length} />
        <Stat label="Horas por semana" value={(minutos / 60).toFixed(1)} />
        <Stat
          label={`Citas posibles (${p.duracion_cita_minutos} min)`}
          value={slots}
        />
      </View>

      {DIAS.map((dia, i) => {
        const bloques = visible.filter((s) => s.dia_semana === i + 1);
        if (!bloques.length) return null;
        return (
          <View key={dia} className="gap-2">
            <Text className="font-sans text-sm font-semibold text-ink">
              {dia}
            </Text>
            {bloques.map((s) =>
              editing === s.id_horario ? (
                <ScheduleForm
                  key={s.id_horario}
                  initial={s}
                  psychologistId={p.id_psicologo}
                  onCancel={() => setEditing(null)}
                  onDone={() => {
                    setEditing(null);
                    void q.reload();
                  }}
                />
              ) : (
                <View
                  key={s.id_horario}
                  className={cn(
                    "flex-row flex-wrap items-center justify-between gap-2 rounded-nf-sm border border-border px-3 py-2",
                    !s.activo && "opacity-60",
                  )}
                >
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-sans text-[15px] text-ink">
                      {hhmm(s.hora_inicio)} – {hhmm(s.hora_fin)}
                    </Text>
                    <Badge text={MODALIDAD[s.modalidad]} ok />
                    {!s.activo ? <Badge text="Inactivo" ok={false} /> : null}
                  </View>
                  <View className="flex-row gap-2">
                    {s.activo ? (
                      <Button
                        title="Editar"
                        variant="secondary"
                        className="min-h-9 px-3 py-1.5"
                        onPress={() => setEditing(s.id_horario)}
                      />
                    ) : null}
                    <Button
                      title={s.activo ? "Desactivar" : "Reactivar"}
                      variant={s.activo ? "secondary" : "success"}
                      className="min-h-9 px-3 py-1.5"
                      loading={busy === s.id_horario}
                      onPress={() => void toggle(s)}
                    />
                  </View>
                </View>
              ),
            )}
          </View>
        );
      })}

      {!visible.length ? (
        <EmptyState message="Este psicólogo no tiene horarios registrados." />
      ) : null}

      {all.some((s) => !s.activo) ? (
        <Button
          title={
            showInactive ? "Ocultar bloques inactivos" : "Ver bloques inactivos"
          }
          variant="secondary"
          onPress={() => setShowInactive((v) => !v)}
        />
      ) : null}

      <Feedback error={error || q.error} />

      <ScheduleForm
        psychologistId={p.id_psicologo}
        onDone={() => void q.reload()}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pestaña: Pacientes                                                  */
/* ------------------------------------------------------------------ */
function PatientsTab({ p }: { p: Psychologist }) {
  const q = useLoad<DashboardPatient[]>(
    () => psychologistsApi.dashboardPatients(p.id_psicologo),
    [p.id_psicologo],
  );

  if (q.loading && !q.data) return <Loading />;
  if (q.error) return <Feedback error={q.error} />;

  const rows = q.data ?? [];
  if (!rows.length)
    return <EmptyState message="No tiene pacientes asignados actualmente." />;

  const now = Date.now();
  const sinEval = rows.filter((r) => !r.fecha_ultima_evaluacion).length;
  const conProxima = rows.filter(
    (r) => r.proxima_cita && new Date(r.proxima_cita).getTime() >= now,
  ).length;

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-3">
        <Stat label="Pacientes" value={rows.length} />
        <Stat label="Con próxima cita" value={conProxima} />
        <Stat label="Sin evaluación" value={sinEval} />
      </View>
      {rows.map((r) => (
        <View
          key={r.id_paciente}
          className="gap-0.5 rounded-nf-sm border border-border p-3"
        >
          <Text className="font-sans font-semibold text-ink">{r.paciente}</Text>
          <Muted>
            {TIPO[r.tipo_persona] ?? r.tipo_persona} · desde{" "}
            {formatDateTime(r.fecha_inicio)}
          </Muted>
          <Muted>
            Expediente:{" "}
            {r.estado_expediente
              ? ESTADO_EXP[r.estado_expediente]
              : "sin abrir"}
            {" · "}Última evaluación:{" "}
            {r.fecha_ultima_evaluacion
              ? formatDateTime(r.fecha_ultima_evaluacion)
              : "ninguna"}
          </Muted>
          <Muted>
            Próxima cita:{" "}
            {r.proxima_cita ? formatDateTime(r.proxima_cita) : "sin agendar"}
          </Muted>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pestaña: Citas                                                      */
/* ------------------------------------------------------------------ */
function AppointmentsTab({ p }: { p: Psychologist }) {
  const q = useLoad<Appointment[]>(
    () =>
      appointmentsApi.byPsychologist(p.id_psicologo) as Promise<Appointment[]>,
    [p.id_psicologo],
  );

  if (q.loading && !q.data) return <Loading />;
  if (q.error) return <Feedback error={q.error} />;

  const citas = q.data ?? [];
  if (!citas.length) return <EmptyState message="Aún no tiene citas." />;

  const now = Date.now();
  const proximas = citas
    .filter(
      (c) =>
        (c.estado === 1 || c.estado === 2) && new Date(c.fin).getTime() >= now,
    )
    .sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
    );

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-3">
        {Object.entries(ESTADO_CITA).map(([k, label]) => (
          <Stat
            key={k}
            label={label}
            value={citas.filter((c) => c.estado === Number(k)).length}
          />
        ))}
      </View>

      <Text className="font-sans text-sm font-semibold text-ink">
        Próximas citas ({proximas.length})
      </Text>
      {proximas.length === 0 ? (
        <Muted>No hay citas programadas por venir.</Muted>
      ) : (
        proximas.slice(0, 10).map((c) => (
          <View
            key={String(c.id_cita)}
            className="gap-0.5 rounded-nf-sm border border-border p-3"
          >
            <Text className="font-sans font-semibold text-ink">
              {formatDateTime(c.inicio)}
            </Text>
            <Muted>
              {c.paciente ?? `Paciente ${c.id_paciente}`} ·{" "}
              {MODALIDAD[c.modalidad]} · {ESTADO_CITA[c.estado]}
            </Muted>
          </View>
        ))
      )}
      {proximas.length > 10 ? (
        <Muted>Se muestran las 10 más cercanas.</Muted>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta por psicólogo                                               */
/* ------------------------------------------------------------------ */
type Tab = "perfil" | "horarios" | "pacientes" | "citas";

function PsychologistCard({
  p,
  open,
  onToggle,
  onChanged,
}: {
  p: Psychologist;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("perfil");

  return (
    <Card className="gap-3">
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        className="gap-1.5"
      >
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 font-sans font-semibold text-ink">
            {p.nombre}
          </Text>
          <Text className="font-sans text-sm text-primary">
            {open ? "Cerrar" : "Gestionar"}
          </Text>
        </View>
        <Muted>
          {p.especialidad ?? "Sin especialidad"} · Cédula {p.cedula_profesional}{" "}
          · {p.duracion_cita_minutos} min por cita
        </Muted>
        <View className="flex-row flex-wrap gap-2">
          <Badge
            text={p.activo_para_citas ? "Recibe citas" : "Sin citas"}
            ok={p.activo_para_citas}
          />
          <Badge
            text={p.chat_disponible ? "Chat activo" : "Sin chat"}
            ok={p.chat_disponible}
          />
        </View>
      </Pressable>

      {open ? (
        <View className="gap-4 border-t border-border pt-4">
          <Choice<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "perfil", label: "Perfil" },
              { value: "horarios", label: "Horarios" },
              { value: "pacientes", label: "Pacientes" },
              { value: "citas", label: "Citas" },
            ]}
          />
          {tab === "perfil" ? <ProfileTab p={p} onChanged={onChanged} /> : null}
          {tab === "horarios" ? <SchedulesTab p={p} /> : null}
          {tab === "pacientes" ? <PatientsTab p={p} /> : null}
          {tab === "citas" ? <AppointmentsTab p={p} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
type Filter = "todos" | "citas" | "sinCitas" | "chat";

export default function Psychologists() {
  const q = useLoad<Psychologist[]>(() => psychologistsApi.list(false));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [openId, setOpenId] = useState<number | null>(null);

  if (q.loading && !q.data) return <Loading />;

  const all = q.data ?? [];
  const term = norm(search.trim());
  const items = all.filter((x) => {
    if (filter === "citas" && !x.activo_para_citas) return false;
    if (filter === "sinCitas" && x.activo_para_citas) return false;
    if (filter === "chat" && !x.chat_disponible) return false;
    if (!term) return true;
    return norm(
      `${x.nombre} ${x.correo} ${x.especialidad ?? ""} ${x.cedula_profesional}`,
    ).includes(term);
  });

  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Psicólogos</H1>
        <Muted className="mb-5">
          {all.length} registrados ·{" "}
          {all.filter((x) => x.activo_para_citas).length} reciben citas ·{" "}
          {all.filter((x) => x.chat_disponible).length} con chat.
        </Muted>

        <View className="mb-5 gap-3">
          <Input
            placeholder="Buscar por nombre, correo, especialidad o cédula"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          <Choice<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todos", label: "Todos" },
              { value: "citas", label: "Reciben citas" },
              { value: "sinCitas", label: "Sin citas" },
              { value: "chat", label: "Con chat" },
            ]}
          />
        </View>

        {q.error ? (
          <Text className="mb-4 font-sans text-sm text-danger">{q.error}</Text>
        ) : null}

        {items.length === 0 ? (
          <EmptyState message="No hay psicólogos que coincidan." />
        ) : (
          <View className="gap-3">
            {items.map((x) => (
              <PsychologistCard
                key={x.id_psicologo}
                p={x}
                open={openId === x.id_psicologo}
                onToggle={() =>
                  setOpenId((cur) =>
                    cur === x.id_psicologo ? null : x.id_psicologo,
                  )
                }
                onChanged={() => void q.reload()}
              />
            ))}
          </View>
        )}
      </Screen>
    </>
  );
}
