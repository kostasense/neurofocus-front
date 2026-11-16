import { appointmentsApi } from "@/api/appointments";
import { evaluationsApi } from "@/api/evaluations";
import { recordsApi } from "@/api/records";
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
import { cn } from "@/lib/cn";
import { confirmAsync } from "@/lib/confirm";
import { formatDateTime } from "@/lib/format";
import type {
  Appointment,
  ClinicalRecord,
  Evaluation,
  RecordAttachment,
  RecordEntry,
  RecordSummary,
} from "@/types/api";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Catálogos y utilidades                                              */
/* ------------------------------------------------------------------ */
const ESTADO: Record<number, string> = {
  1: "Activo",
  2: "Cerrado",
  3: "Archivado",
};
const TIPO_ENTRADA: Record<number, string> = {
  1: "Nota de sesión",
  2: "Valoración",
  3: "Plan",
  4: "Seguimiento",
  5: "Referencia",
  6: "Cierre",
};
const TIPO: Record<string, string> = {
  A: "Alumno",
  D: "Docente",
  PA: "Personal administrativo",
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

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};
const tipoLabel = (t?: string | null) =>
  t ? (TIPO[t.trim()] ?? t.trim()) : "";
const sizeLabel = (n: number | string) => {
  const b = Number(n);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
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
const estadoTone = (e: number) => (e === 1 ? "ok" : "muted");

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-w-[140px] flex-1 gap-1">
      <Muted>{label}</Muted>
      <Text className="font-sans text-xl font-semibold text-ink">{value}</Text>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Adjuntos de una entrada                                             */
/* ------------------------------------------------------------------ */
function Attachments({ entryId }: { entryId: number }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<RecordAttachment[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || list) return;
    let alive = true;
    (recordsApi.attachments(entryId) as Promise<RecordAttachment[]>)
      .then((r) => alive && setList(r))
      .catch((e) => {
        if (!alive) return;
        setError(errMsg(e, "No se pudieron cargar los adjuntos"));
        setList([]);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <View className="gap-1.5">
      <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)}>
        <Text className="font-sans text-[13px] font-semibold text-primary-dark">
          {open ? "Ocultar adjuntos" : "Ver adjuntos"}
        </Text>
      </Pressable>
      {open ? (
        list === null ? (
          <Muted>Cargando…</Muted>
        ) : error ? (
          <Text className="font-sans text-sm text-danger">{error}</Text>
        ) : list.length === 0 ? (
          <Muted>Sin adjuntos registrados.</Muted>
        ) : (
          list.map((a) => (
            <View
              key={String(a.idAdjunto)}
              className="rounded-nf-sm border border-border p-2.5"
            >
              <Text className="font-sans text-[13px] font-semibold text-ink">
                {a.nombreArchivo}
              </Text>
              <Muted>
                {a.tipoMime} · {sizeLabel(a.tamanoBytes)} ·{" "}
                {formatDateTime(a.fechaCarga)}
              </Muted>
              <Muted>SHA-256: {a.hashSha256.slice(0, 16)}…</Muted>
            </View>
          ))
        )
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Entrada del expediente                                              */
/* ------------------------------------------------------------------ */
function EntryCard({
  e,
  mine,
  onChanged,
  onMessage,
}: {
  e: RecordEntry;
  mine: boolean;
  onChanged: () => void;
  onMessage: (m: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cancel = async () => {
    if (!motivo.trim()) return setError("Indica el motivo de la anulación.");
    const ok = await confirmAsync(
      "Anular entrada",
      "La entrada no se elimina del historial: queda marcada como anulada y su contenido deja de mostrarse. No se puede deshacer.",
      "Anular entrada",
      "Volver",
    );
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await recordsApi.cancelEntry(Number(e.idEntrada), {
        motivoAnulacion: motivo.trim(),
      });
      onMessage("La entrada fue anulada.");
      onChanged();
    } catch (err) {
      setError(errMsg(err, "No fue posible anular la entrada"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn("gap-2", e.anulada && "opacity-70")}>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="font-sans text-[15px] font-semibold text-ink">
          {TIPO_ENTRADA[e.tipo]}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {e.anulada ? <Pill text="Anulada" tone="danger" /> : null}
        </View>
      </View>
      <Muted>
        {formatDateTime(e.fechaRegistro)}
        {e.psicologo ? ` · ${e.psicologo}` : ""}
        {e.idCita ? ` · Cita #${String(e.idCita)}` : ""}
        {e.idEvaluacion ? ` · Evaluación #${String(e.idEvaluacion)}` : ""}
      </Muted>

      {e.anulada ? (
        <Text className="font-sans text-[14px] text-muted">
          Motivo de anulación: {e.motivoAnulacion ?? "—"}
        </Text>
      ) : (
        <Text className="font-sans text-[15px] leading-6 text-ink">
          {e.contenido}
        </Text>
      )}

      <Attachments entryId={Number(e.idEntrada)} />

      {mine && !e.anulada && !cancelling ? (
        <View className="flex-row pt-1">
          <Button
            title="Anular entrada"
            variant="danger"
            onPress={() => setCancelling(true)}
          />
        </View>
      ) : null}
      {cancelling ? (
        <View className="gap-2 pt-1">
          <Input
            label="Motivo de la anulación"
            value={motivo}
            onChangeText={setMotivo}
            maxLength={250}
          />
          {error ? (
            <Text className="font-sans text-sm text-danger">{error}</Text>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            <Button
              title="Confirmar anulación"
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
/* Nueva entrada                                                       */
/* ------------------------------------------------------------------ */
function NewEntry({
  recordId,
  patientId,
  onCreated,
}: {
  recordId: number;
  patientId: number;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<number>(1);
  const [contenido, setContenido] = useState("");
  const [citaId, setCitaId] = useState(0);
  const [evalId, setEvalId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Opciones para relacionar la entrada con una cita o una evaluación.
  const citas = useLoad<Appointment[]>(
    () => appointmentsApi.byPsychologist(user!.userId),
    [user?.userId],
  );
  const evals = useLoad<Evaluation[]>(
    () => evaluationsApi.byPatient(patientId),
    [patientId],
  );

  const citaOpts = (citas.data ?? [])
    .filter((c) => c.id_paciente === patientId && c.estado !== 6)
    .sort((a, b) => +new Date(b.inicio) - +new Date(a.inicio))
    .slice(0, 4);
  const evalOpts = (evals.data ?? []).filter((x) => x.estado !== 4).slice(0, 5);

  const save = async () => {
    if (!contenido.trim())
      return setError("Escribe el contenido de la entrada.");
    setBusy(true);
    setError("");
    try {
      await recordsApi.createEntry(recordId, {
        tipo,
        contenido: contenido.trim(),
        ...(citaId ? { idCita: citaId } : {}),
        ...(evalId ? { idEvaluacion: evalId } : {}),
      });
      setContenido("");
      setCitaId(0);
      setEvalId(0);
      onCreated();
    } catch (e) {
      setError(errMsg(e, "No fue posible guardar la entrada"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-4">
      <H2>Nueva entrada</H2>
      <View className="gap-1.5">
        <Text className="font-sans text-sm font-medium text-ink">Tipo</Text>
        <Choice
          value={tipo}
          onChange={setTipo}
          options={Object.entries(TIPO_ENTRADA).map(([k, label]) => ({
            value: Number(k),
            label,
          }))}
        />
      </View>

      <Input
        label="Contenido"
        multiline
        numberOfLines={8}
        value={contenido}
        onChangeText={setContenido}
        style={{ minHeight: 160, textAlignVertical: "top", paddingTop: 10 }}
      />
      <Muted>
        Se cifra en el servidor antes de guardarse. Una vez registrada no se
        edita: si hay un error, anúlala y crea una nueva.
      </Muted>

      {citaOpts.length > 0 ? (
        <View className="gap-1.5">
          <Text className="font-sans text-sm font-medium text-ink">
            Cita relacionada (opcional)
          </Text>
          <Choice
            value={citaId}
            onChange={setCitaId}
            options={[
              { value: 0, label: "Ninguna" },
              ...citaOpts.map((c) => ({
                value: Number(c.id_cita),
                label: `${formatDateTime(c.inicio)} · ${ESTADO_CITA[c.estado]}`,
              })),
            ]}
          />
        </View>
      ) : null}

      {evalOpts.length > 0 ? (
        <View className="gap-1.5">
          <Text className="font-sans text-sm font-medium text-ink">
            Evaluación relacionada (opcional)
          </Text>
          <Choice
            value={evalId}
            onChange={setEvalId}
            options={[
              { value: 0, label: "Ninguna" },
              ...evalOpts.map((x) => ({
                value: Number(x.id_evaluacion),
                label: `${formatDateTime(x.fecha_inicio)} · ${ESTADO_EVAL[x.estado]}`,
              })),
            ]}
          />
        </View>
      ) : null}

      {error ? (
        <Text className="font-sans text-sm text-danger">{error}</Text>
      ) : null}
      <Button
        title="Guardar entrada"
        loading={busy}
        onPress={() => void save()}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Detalle del expediente                                              */
/* ------------------------------------------------------------------ */
function RecordDetail({
  summary,
  onBack,
  onChanged,
}: {
  summary: RecordSummary;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const id = Number(summary.id_expediente);

  const rec = useLoad<ClinicalRecord>(
    () => recordsApi.get(id) as Promise<ClinicalRecord>,
    [id],
  );
  const entries = useLoad<RecordEntry[]>(
    () => recordsApi.entries(id) as Promise<RecordEntry[]>,
    [id],
  );

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const r = rec.data;
  const estado = r?.estado ?? summary.estado;
  const active = estado === 1;

  const close = async (nuevo: 2 | 3) => {
    const ok = await confirmAsync(
      nuevo === 2 ? "Cerrar expediente" : "Archivar expediente",
      "Ya no se podrán agregar entradas. Solo administración puede reabrirlo.",
      nuevo === 2 ? "Cerrar" : "Archivar",
      "Volver",
    );
    if (!ok) return;
    setBusy(nuevo);
    setError("");
    try {
      await recordsApi.close(id, { estado: nuevo });
      setMessage(
        nuevo === 2
          ? "El expediente fue cerrado."
          : "El expediente fue archivado.",
      );
      void rec.reload();
      onChanged();
    } catch (e) {
      setError(errMsg(e, "No fue posible cambiar el estado"));
    } finally {
      setBusy(null);
    }
  };

  const list = entries.data ?? [];

  return (
    <View className="gap-5">
      <View className="flex-row">
        <Button title="← Expedientes" variant="secondary" onPress={onBack} />
      </View>

      <Card className="gap-2">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <H2>{summary.paciente}</H2>
          <Pill text={ESTADO[estado]} tone={estadoTone(estado)} />
        </View>
        <Muted>
          Expediente #{String(summary.id_expediente)}
          {summary.num_control_o_num_empleado
            ? ` · ${summary.num_control_o_num_empleado}`
            : ""}
          {summary.tipo_persona ? ` · ${tipoLabel(summary.tipo_persona)}` : ""}
        </Muted>
        <Muted>
          Abierto el{" "}
          {formatDateTime(r?.fecha_apertura ?? summary.fecha_apertura)}
          {(r?.fecha_cierre ?? summary.fecha_cierre)
            ? ` · Cerrado el ${formatDateTime((r?.fecha_cierre ?? summary.fecha_cierre)!)}`
            : ""}
        </Muted>
        {r?.psicologo_responsable ? (
          <Muted>Responsable: {r.psicologo_responsable}</Muted>
        ) : null}
        {(r?.motivo_consulta ?? summary.motivo_consulta) ? (
          <View className="gap-0.5 pt-1">
            <Text className="font-sans text-sm font-semibold text-ink">
              Motivo de consulta
            </Text>
            <Text className="font-sans text-[15px] leading-6 text-ink">
              {r?.motivo_consulta ?? summary.motivo_consulta}
            </Text>
          </View>
        ) : null}
        {rec.error ? (
          <Text className="font-sans text-sm text-danger">{rec.error}</Text>
        ) : null}

        {active ? (
          <View className="flex-row flex-wrap gap-2 pt-2">
            <Button
              title="Cerrar expediente"
              variant="secondary"
              loading={busy === 2}
              onPress={() => void close(2)}
            />
            <Button
              title="Archivar"
              variant="secondary"
              loading={busy === 3}
              onPress={() => void close(3)}
            />
          </View>
        ) : (
          <Muted>
            Expediente {ESTADO[estado].toLowerCase()}: solo lectura.
            Administración puede reabrirlo.
          </Muted>
        )}
        {error ? (
          <Text className="font-sans text-sm text-danger">{error}</Text>
        ) : null}
      </Card>

      {message ? (
        <Text className="rounded-nf-sm bg-primary-light p-3 font-sans text-sm text-primary-dark">
          {message}
        </Text>
      ) : null}

      {active ? (
        <NewEntry
          recordId={id}
          patientId={summary.id_paciente}
          onCreated={() => {
            setMessage("La entrada fue guardada.");
            void entries.reload();
          }}
        />
      ) : null}

      <View className="gap-3">
        <H2>Entradas ({list.length})</H2>
        {entries.error ? (
          <Text className="font-sans text-sm text-danger">{entries.error}</Text>
        ) : null}
        {entries.loading && !entries.data ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState message="Este expediente aún no tiene entradas." />
        ) : (
          list.map((e) => (
            <EntryCard
              key={String(e.idEntrada)}
              e={e}
              mine={e.idPsicologo === user!.userId}
              onChanged={() => void entries.reload()}
              onMessage={setMessage}
            />
          ))
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Records() {
  const { user } = useAuth();
  const id = user!.userId;
  const params = useLocalSearchParams<{ paciente?: string }>();

  const q = useLoad<RecordSummary[]>(() => recordsApi.byPsychologist(id), [id]);

  const [patientId, setPatientId] = useState<number | null>(
    params.paciente ? Number(params.paciente) : null,
  );
  const [estado, setEstado] = useState(0);
  const [search, setSearch] = useState("");

  if (q.loading && !q.data) return <Loading />;

  const all = q.data ?? [];
  const selected = patientId
    ? all.find((r) => r.id_paciente === patientId)
    : undefined;

  const counts = (e: number) =>
    e === 0 ? all.length : all.filter((r) => r.estado === e).length;
  const list = all
    .filter((r) => estado === 0 || r.estado === estado)
    .filter((r) =>
      `${r.paciente} ${r.num_control_o_num_empleado ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    );

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[760px] gap-5">
          {selected ? (
            <RecordDetail
              key={String(selected.id_expediente)}
              summary={selected}
              onBack={() => setPatientId(null)}
              onChanged={() => void q.reload()}
            />
          ) : (
            <>
              <View className="gap-1">
                <H1>Expedientes</H1>
                <Muted>
                  Información profesional cifrada de los pacientes a tu cargo.
                  Trátala con confidencialidad.
                </Muted>
              </View>

              <View className="flex-row flex-wrap gap-3">
                <Stat label="Expedientes" value={String(counts(0))} />
                <Stat label="Activos" value={String(counts(1))} />
                <Stat
                  label="Cerrados o archivados"
                  value={String(counts(2) + counts(3))}
                />
              </View>

              <View className="gap-3">
                <Choice
                  value={estado}
                  onChange={setEstado}
                  options={[
                    { value: 0, label: `Todos (${counts(0)})` },
                    { value: 1, label: `Activos (${counts(1)})` },
                    { value: 2, label: `Cerrados (${counts(2)})` },
                    { value: 3, label: `Archivados (${counts(3)})` },
                  ]}
                />
                <Input
                  placeholder="Buscar por paciente o número de control"
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                />
              </View>

              {q.error ? (
                <Text className="font-sans text-sm text-danger">{q.error}</Text>
              ) : null}
              {patientId && !selected ? (
                <Muted>Ese paciente aún no tiene expediente a tu cargo.</Muted>
              ) : null}

              {list.length === 0 ? (
                <EmptyState
                  message={
                    all.length === 0
                      ? "Aún no tienes expedientes. Créalos desde Pacientes."
                      : "No hay expedientes con estos filtros."
                  }
                />
              ) : (
                list.map((r) => (
                  <Pressable
                    key={String(r.id_expediente)}
                    accessibilityRole="button"
                    onPress={() => setPatientId(r.id_paciente)}
                  >
                    <Card className="gap-1.5">
                      <View className="flex-row flex-wrap items-center justify-between gap-2">
                        <Text className="font-sans text-base font-semibold text-ink">
                          {r.paciente}
                        </Text>
                        <Pill
                          text={ESTADO[r.estado]}
                          tone={estadoTone(r.estado)}
                        />
                      </View>
                      <Muted>
                        Expediente #{String(r.id_expediente)}
                        {r.num_control_o_num_empleado
                          ? ` · ${r.num_control_o_num_empleado}`
                          : ""}
                        {r.tipo_persona
                          ? ` · ${tipoLabel(r.tipo_persona)}`
                          : ""}
                      </Muted>
                      <Muted>
                        Abierto el {formatDateTime(r.fecha_apertura)}
                        {r.fecha_cierre
                          ? ` · Cerrado el ${formatDateTime(r.fecha_cierre)}`
                          : ""}
                      </Muted>
                      {r.motivo_consulta ? (
                        <Text
                          numberOfLines={2}
                          className="font-sans text-[14px] leading-5 text-ink"
                        >
                          {r.motivo_consulta}
                        </Text>
                      ) : null}
                    </Card>
                  </Pressable>
                ))
              )}
            </>
          )}
        </View>
      </Screen>
    </>
  );
}
