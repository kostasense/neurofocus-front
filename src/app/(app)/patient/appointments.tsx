import { appointmentsApi } from "@/api/appointments";
import { assignmentsApi } from "@/api/assignments";
import { psychologistsApi } from "@/api/psychologists";
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
  freeByDay,
  monthMatrix,
  slotsForDay,
  startOfMonth,
  type Slot,
} from "@/lib/availability";
import { cn } from "@/lib/cn";
import { confirmAsync } from "@/lib/confirm";
import { formatDateTime } from "@/lib/format";
import type { Appointment, Psychologist } from "@/types/api";
import { useMemo, useState } from "react";
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
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

const isActive = (c: Appointment) => c.estado === 1 || c.estado === 2;
const isUpcoming = (c: Appointment) =>
  isActive(c) && new Date(c.inicio).getTime() > Date.now();

const monthLabel = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(
    d,
  );
const dayLabel = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
const timeLabel = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(d);

/* ------------------------------------------------------------------ */
/* Calendario y agendado                                               */
/* ------------------------------------------------------------------ */
type BookerProps = {
  psychologists: Psychologist[];
  assignedId: number | null;
  citas: Appointment[];
  /** Si se indica, se reprograma esa cita (mismo psicólogo). */
  editing: Appointment | null;
  onDone: (message: string) => void;
  onCancelEdit: () => void;
};

function Booker({
  psychologists,
  assignedId,
  citas,
  editing,
  onDone,
  onCancelEdit,
}: BookerProps) {
  const fixedId = editing ? editing.id_psicologo : assignedId;
  const [chosenId, setChosenId] = useState<number>(0);
  const psyId = fixedId ?? chosenId;
  const psy = psychologists.find((p) => p.id_psicologo === psyId);

  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selDay, setSelDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  const data = useLoad(async () => {
    if (!psyId) return null;
    const from = startOfMonth(month).toISOString();
    const to = startOfMonth(month, 1).toISOString();
    const [schedules, busyList] = await Promise.all([
      appointmentsApi.schedules(psyId),
      appointmentsApi.busy(psyId, from, to),
    ]);
    return { schedules, busyList };
  }, [psyId, monthKey]);

  // Se excluye la cita que se está reprogramando para que su propio horario
  // aparezca libre.
  const editingStart = editing ? new Date(editing.inicio).getTime() : null;
  const sameAsEditing = (i: { inicio: string; fin: string }) =>
    editingStart !== null &&
    new Date(i.inicio).getTime() === editingStart &&
    new Date(i.fin).getTime() === new Date(editing!.fin).getTime();

  const busyList = (data.data?.busyList ?? []).filter((i) => !sameAsEditing(i));
  const own = citas
    .filter((c) => isActive(c) && !sameAsEditing(c))
    .map((c) => ({ inicio: c.inicio, fin: c.fin }));
  const schedules = data.data?.schedules ?? [];
  const duracion = psy?.duracion_cita_minutos ?? 0;

  const free = useMemo(
    () => freeByDay(month, schedules, duracion, busyList, own),
    [month, data.data, duracion, citas, editing],
  );
  const slots = selDay
    ? slotsForDay(selDay, schedules, duracion, busyList, own)
    : [];

  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() &&
    month.getMonth() === today.getMonth();

  const changeMonth = (delta: number) => {
    setMonth((m) => startOfMonth(m, delta));
    setSelDay(null);
    setSlot(null);
  };

  const confirm = async () => {
    if (!slot || !psyId) return;
    setError("");
    setBusy(true);
    try {
      if (editing) {
        await appointmentsApi.reschedule(Number(editing.id_cita), {
          inicio: slot.start.toISOString(),
          fin: slot.end.toISOString(),
          modalidad: slot.modalidad,
        });
        onDone("Tu cita fue reprogramada.");
      } else {
        await appointmentsApi.create({
          idPsicologo: psyId,
          inicio: slot.start.toISOString(),
          fin: slot.end.toISOString(),
          modalidad: slot.modalidad,
          ...(notas.trim() ? { notasAgenda: notas.trim() } : {}),
        });
        onDone(
          "Tu cita fue solicitada. El psicólogo la confirmará próximamente.",
        );
      }
      setSlot(null);
      setSelDay(null);
      setNotas("");
      void data.reload();
    } catch (e) {
      setError(errMsg(e, "No fue posible guardar la cita"));
      void data.reload(); // el horario pudo ocuparse mientras tanto
    } finally {
      setBusy(false);
    }
  };

  const weeks = monthMatrix(month);

  return (
    <Card className="gap-4">
      <View className="flex-row items-center justify-between gap-2">
        <H2>{editing ? "Reprogramar cita" : "Agendar cita"}</H2>
        {editing ? (
          <Button
            title="Cancelar cambio"
            variant="secondary"
            onPress={onCancelEdit}
          />
        ) : null}
      </View>

      {editing ? (
        <Muted>
          Cita actual: {formatDateTime(editing.inicio)} con{" "}
          {editing.psicologo ?? `psicólogo ${editing.id_psicologo}`}. Elige el
          nuevo horario.
        </Muted>
      ) : null}

      {/* Psicólogo */}
      {fixedId ? (
        <Text className="font-sans text-[15px] text-ink">
          Psicólogo:{" "}
          <Text className="font-semibold">
            {psy?.nombre ?? editing?.psicologo ?? `#${fixedId}`}
          </Text>
          {psy?.especialidad ? ` · ${psy.especialidad}` : ""}
        </Text>
      ) : (
        <View className="gap-1.5">
          <Text className="font-sans text-sm font-medium text-ink">
            Elige un psicólogo
          </Text>
          {psychologists.length === 0 ? (
            <Muted>No hay psicólogos disponibles para citas por ahora.</Muted>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {psychologists.map((p) => {
                const on = p.id_psicologo === chosenId;
                return (
                  <Pressable
                    key={p.id_psicologo}
                    accessibilityRole="button"
                    onPress={() => {
                      setChosenId(p.id_psicologo);
                      setSelDay(null);
                      setSlot(null);
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5",
                      on
                        ? "border-primary bg-primary"
                        : "border-border bg-surface",
                    )}
                  >
                    <Text
                      className={cn(
                        "font-sans text-sm",
                        on ? "font-semibold text-white" : "text-ink",
                      )}
                    >
                      {p.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Muted>
            Al agendar tu primera cita, ese psicólogo quedará como el tuyo.
          </Muted>
        </View>
      )}

      {psyId && psy ? (
        <>
          <Muted>
            Duración de cada cita: {duracion} min. Los horarios se muestran en
            la zona horaria de tu dispositivo.
          </Muted>

          {/* Encabezado de mes */}
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
              disabled={isCurrentMonth}
              onPress={() => changeMonth(-1)}
              className={cn(
                "h-10 w-10 items-center justify-center",
                isCurrentMonth && "opacity-30",
              )}
            >
              <Text className="font-sans text-2xl text-ink">‹</Text>
            </Pressable>
            <Text className="font-sans text-base font-semibold capitalize text-ink">
              {monthLabel(month)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
              onPress={() => changeMonth(1)}
              className="h-10 w-10 items-center justify-center"
            >
              <Text className="font-sans text-2xl text-ink">›</Text>
            </Pressable>
          </View>

          {data.error ? (
            <Text className="font-sans text-sm text-danger">{data.error}</Text>
          ) : null}

          {/* Cuadrícula */}
          <View className="gap-1">
            <View className="flex-row">
              {DIAS.map((d) => (
                <Text
                  key={d}
                  className="flex-1 text-center font-sans text-xs text-muted"
                >
                  {d}
                </Text>
              ))}
            </View>
            {weeks.map((week, wi) => (
              <View key={wi} className="flex-row gap-1">
                {week.map((day, di) => {
                  if (!day) return <View key={di} className="h-12 flex-1" />;
                  const n = free.get(dayKey(day)) ?? 0;
                  const selected = !!selDay && dayKey(selDay) === dayKey(day);
                  const enabled = n > 0 && !data.loading;
                  return (
                    <Pressable
                      key={di}
                      accessibilityRole="button"
                      accessibilityLabel={`${dayLabel(day)}, ${n} horarios libres`}
                      disabled={!enabled}
                      onPress={() => {
                        setSelDay(day);
                        setSlot(null);
                      }}
                      className={cn(
                        "h-12 flex-1 items-center justify-center rounded-nf-sm border",
                        selected
                          ? "border-primary bg-primary"
                          : enabled
                            ? "border-primary bg-primary-light"
                            : "border-transparent",
                        !enabled && "opacity-40",
                      )}
                    >
                      <Text
                        className={cn(
                          "font-sans text-sm",
                          selected ? "font-semibold text-white" : "text-ink",
                        )}
                      >
                        {day.getDate()}
                      </Text>
                      {enabled ? (
                        <Text
                          className={cn(
                            "font-sans text-[10px]",
                            selected ? "text-white" : "text-primary-dark",
                          )}
                        >
                          {n} lib.
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          {data.loading ? <Muted>Cargando disponibilidad…</Muted> : null}
          {!data.loading &&
          !data.error &&
          [...free.values()].every((n) => n === 0) ? (
            <Muted>
              No hay horarios libres este mes. Prueba con el siguiente.
            </Muted>
          ) : null}

          {/* Horarios del día */}
          {selDay ? (
            <View className="gap-2">
              <Text className="font-sans text-sm font-medium capitalize text-ink">
                {dayLabel(selDay)}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {slots.map((s) => {
                  const on = slot?.start.getTime() === s.start.getTime();
                  const libre = s.status === "libre";
                  return (
                    <Pressable
                      key={`${s.blockId}-${s.start.getTime()}`}
                      accessibilityRole="button"
                      disabled={!libre}
                      onPress={() => setSlot(s)}
                      className={cn(
                        "rounded-nf-sm border px-3 py-2",
                        on
                          ? "border-primary bg-primary"
                          : libre
                            ? "border-border bg-surface"
                            : "border-border bg-border opacity-50",
                      )}
                    >
                      <Text
                        className={cn(
                          "font-sans text-sm",
                          on ? "font-semibold text-white" : "text-ink",
                        )}
                      >
                        {timeLabel(s.start)}
                      </Text>
                      <Text
                        className={cn(
                          "font-sans text-[10px]",
                          on ? "text-white" : "text-muted",
                        )}
                      >
                        {libre
                          ? MODALIDAD[s.modalidad]
                          : s.status === "tuya"
                            ? "Ya tienes cita"
                            : "Ocupado"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <Muted>Elige un día resaltado para ver los horarios.</Muted>
          )}

          {/* Confirmación */}
          {slot ? (
            <View className="gap-3 rounded-nf-sm border border-border p-3">
              <Text className="font-sans text-[15px] text-ink">
                {editing ? "Nuevo horario: " : "Cita: "}
                <Text className="font-semibold capitalize">
                  {dayLabel(slot.start)}, {timeLabel(slot.start)} –{" "}
                  {timeLabel(slot.end)}
                </Text>{" "}
                · {MODALIDAD[slot.modalidad]}
              </Text>
              {!editing ? (
                <Input
                  label="Nota para la agenda (opcional)"
                  value={notas}
                  onChangeText={setNotas}
                  maxLength={500}
                  placeholder="Sin información clínica"
                />
              ) : null}
              {error ? (
                <Text className="font-sans text-sm text-danger">{error}</Text>
              ) : null}
              <Button
                title={editing ? "Confirmar reprogramación" : "Solicitar cita"}
                loading={busy}
                onPress={() => void confirm()}
              />
            </View>
          ) : error ? (
            <Text className="font-sans text-sm text-danger">{error}</Text>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de cita                                                     */
/* ------------------------------------------------------------------ */
function CitaCard({
  c,
  onReschedule,
  onChanged,
  onMessage,
}: {
  c: Appointment;
  onReschedule: (c: Appointment) => void;
  onChanged: () => void;
  onMessage: (m: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editable = isUpcoming(c);

  const cancel = async () => {
    if (!motivo.trim()) return setError("Indica el motivo de la cancelación.");
    const ok = await confirmAsync(
      "Cancelar cita",
      `¿Cancelar la cita del ${formatDateTime(c.inicio)}?`,
      "Cancelar cita",
      "Volver",
    );
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await appointmentsApi.cancel(Number(c.id_cita), motivo.trim());
      onMessage("La cita fue cancelada.");
      onChanged();
    } catch (e) {
      setError(errMsg(e, "No fue posible cancelar la cita"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-2">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="font-sans font-semibold text-ink">
          {c.psicologo ?? `Psicólogo #${c.id_psicologo}`}
        </Text>
        <Text
          className={cn(
            "rounded-nf-sm px-2 py-0.5 font-sans text-xs",
            c.estado === 2 || c.estado === 3
              ? "bg-primary-light text-primary-dark"
              : "bg-border text-muted",
          )}
        >
          {ESTADO[c.estado]}
        </Text>
      </View>
      <Muted>
        {formatDateTime(c.inicio)} · {MODALIDAD[c.modalidad]}
      </Muted>
      {c.notas_agenda ? <Muted>Nota: {c.notas_agenda}</Muted> : null}
      {c.estado === 4 && c.motivo_cancelacion ? (
        <Muted>Motivo: {c.motivo_cancelacion}</Muted>
      ) : null}

      {editable && !cancelling ? (
        <View className="flex-row flex-wrap gap-2 pt-1">
          <Button
            title="Reprogramar"
            variant="secondary"
            onPress={() => onReschedule(c)}
          />
          <Button
            title="Cancelar cita"
            variant="danger"
            onPress={() => setCancelling(true)}
          />
        </View>
      ) : null}

      {cancelling ? (
        <View className="gap-2 pt-1">
          <Input
            label="Motivo de la cancelación"
            value={motivo}
            onChangeText={setMotivo}
            maxLength={250}
          />
          {error ? (
            <Text className="font-sans text-sm text-danger">{error}</Text>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            <Button
              title="Confirmar cancelación"
              variant="danger"
              loading={busy}
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
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Appointments() {
  const { user } = useAuth();
  const userId = user!.userId;

  const q = useLoad(async () => {
    const [psychologists, citas, assigned] = await Promise.all([
      psychologistsApi.list(false),
      appointmentsApi.byPatient(userId),
      (
        assignmentsApi.current(userId) as Promise<{
          id_psicologo: number;
        } | null>
      ).catch(() => null),
    ]);
    return { psychologists, citas, assigned };
  }, [userId]);

  const [editing, setEditing] = useState<Appointment | null>(null);
  const [message, setMessage] = useState("");

  if (q.loading && !q.data) return <Loading />;

  const citas = [...(q.data?.citas ?? [])].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  );
  const upcoming = citas.filter(isUpcoming);
  const history = citas.filter((c) => !isUpcoming(c)).reverse();
  const assignedId = q.data?.assigned?.id_psicologo ?? null;
  const bookable = (q.data?.psychologists ?? []).filter(
    (p) => p.activo && p.activo_para_citas,
  );
  // En reprogramación el psicólogo de la cita debe estar en la lista aunque ya
  // no esté activo para nuevas citas.
  const psychologists = editing
    ? (q.data?.psychologists ?? [])
    : assignedId
      ? (q.data?.psychologists ?? []).filter(
          (p) => p.id_psicologo === assignedId,
        )
      : bookable;

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[700px] gap-6">
          <View className="gap-1">
            <H1>Mis citas</H1>
            <Muted>
              Elige un día y horario disponibles. Tu cita queda solicitada hasta
              que el psicólogo la confirme.
            </Muted>
          </View>

          {message ? (
            <Text className="rounded-nf-sm bg-primary-light p-3 font-sans text-sm text-primary-dark">
              {message}
            </Text>
          ) : null}
          {q.error ? (
            <Text className="font-sans text-sm text-danger">{q.error}</Text>
          ) : null}

          <Booker
            key={editing ? `edit-${editing.id_cita}` : "new"}
            psychologists={psychologists}
            assignedId={assignedId}
            citas={citas}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            onDone={(m) => {
              setMessage(m);
              setEditing(null);
              void q.reload();
            }}
          />

          <View className="gap-3">
            <H2>Próximas citas</H2>
            {upcoming.length === 0 ? (
              <EmptyState message="No tienes citas próximas." />
            ) : (
              upcoming.map((c) => (
                <CitaCard
                  key={String(c.id_cita)}
                  c={c}
                  onReschedule={(x) => {
                    setMessage("");
                    setEditing(x);
                  }}
                  onChanged={() => void q.reload()}
                  onMessage={setMessage}
                />
              ))
            )}
          </View>

          {history.length > 0 ? (
            <View className="gap-3">
              <H2>Historial</H2>
              {history.map((c) => (
                <CitaCard
                  key={String(c.id_cita)}
                  c={c}
                  onReschedule={() => {}}
                  onChanged={() => {}}
                  onMessage={() => {}}
                />
              ))}
            </View>
          ) : null}
        </View>
      </Screen>
    </>
  );
}
