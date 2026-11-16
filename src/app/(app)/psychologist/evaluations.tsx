import { evaluationsApi, type EvaluationApplication } from "@/api/evaluations";
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
import { confirmAsync } from "@/lib/confirm";
import { formatDateTime } from "@/lib/format";
import {
  GAD7,
  INSTRUMENTS,
  PHQ9,
  PHQ9_DIFICULTAD,
  PSS14,
  type Instrument,
} from "@/lib/instruments";
import type { Evaluation } from "@/types/api";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Catálogos y utilidades                                              */
/* ------------------------------------------------------------------ */
const ESTADO: Record<number, string> = {
  1: "Abierta",
  2: "Completa",
  3: "Cerrada incompleta",
  4: "Anulada",
};
const ESTADO_APP: Record<number, string> = {
  1: "En proceso",
  2: "Completada",
  3: "Abandonada",
  4: "Anulada",
};
const TIPO: Record<string, string> = {
  A: "Alumno",
  D: "Docente",
  PA: "Personal administrativo",
};
/** Reactivos del PSS-14 que se puntúan de forma invertida. */
const PSS14_INVERTIDOS = [4, 5, 6, 7, 9, 10, 13];

type View_ = "todas" | "pendientes" | "alerta" | "revisadas";

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

const hasAlert = (e: Evaluation) => Number(e.alerta_prioritaria) === 1;

const nivelLabel = (ins: Instrument, nivel: number | null) =>
  nivel == null ? null : (ins.niveles[nivel] ?? `Nivel ${nivel}`);

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

function Score({
  ins,
  puntaje,
  nivel,
}: {
  ins: Instrument;
  puntaje: number | null;
  nivel: number | null;
}) {
  const label = nivelLabel(ins, nivel);
  return (
    <View className="min-w-[110px] flex-1 rounded-nf-sm border border-border bg-background p-2.5">
      <Text className="font-sans text-xs text-muted">{ins.corto}</Text>
      <Text className="font-sans text-base font-semibold text-ink">
        {puntaje == null ? "—" : `${puntaje}/${ins.puntajeMax}`}
      </Text>
      {label ? (
        <Text className="font-sans text-xs text-ink">{label}</Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Respuestas por instrumento                                          */
/* ------------------------------------------------------------------ */
function InstrumentAnswers({
  ins,
  apps,
}: {
  ins: Instrument;
  apps: EvaluationApplication[];
}) {
  const mine = apps.filter((a) => a.id_instrumento === ins.id);
  // La aplicación completada más reciente; si no hay, la más reciente.
  const sorted = [...mine].sort(
    (a, b) => Number(b.id_aplicacion) - Number(a.id_aplicacion),
  );
  const app = sorted.find((a) => a.estado === 2) ?? sorted[0];

  if (!app)
    return (
      <View className="gap-1">
        <Text className="font-sans text-sm font-semibold text-ink">
          {ins.nombre}
        </Text>
        <Muted>No se aplicó en esta evaluación.</Muted>
      </View>
    );

  const byItem = new Map(
    app.respuestas.map((r) => [r.numero_reactivo, r.valor]),
  );
  const label = (v: number) =>
    ins.opciones.find((o) => o.valor === v)?.label ?? String(v);
  const nivel = nivelLabel(ins, app.nivel);

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="font-sans text-sm font-semibold text-ink">
          {ins.nombre}
        </Text>
        <Pill
          text={ESTADO_APP[app.estado]}
          tone={app.estado === 2 ? "ok" : "muted"}
        />
      </View>
      <Muted>
        {app.puntaje_total != null
          ? `Puntaje ${app.puntaje_total}/${ins.puntajeMax}${nivel ? ` · ${nivel}` : ""}`
          : "Sin puntaje"}
        {app.fecha_fin ? ` · Terminada ${formatDateTime(app.fecha_fin)}` : ""}
      </Muted>
      {ins.id === PSS14.id ? (
        <Muted>
          Los reactivos {PSS14_INVERTIDOS.join(", ")} se puntúan de forma
          invertida; abajo se muestra la respuesta tal como la marcó el
          paciente.
        </Muted>
      ) : null}

      <View className="gap-1.5">
        {ins.preguntas.map((q, i) => {
          const n = i + 1;
          const v = byItem.get(n);
          const risk = ins.id === PHQ9.id && n === 9 && v != null && v > 0;
          return (
            <View
              key={n}
              className={cn(
                "rounded-nf-sm border p-2.5",
                risk ? "border-danger bg-red-50" : "border-border",
              )}
            >
              <Text className="font-sans text-[13px] leading-5 text-ink">
                {n}. {q}
              </Text>
              <Text
                className={cn(
                  "font-sans text-[13px] font-semibold",
                  risk ? "text-danger" : "text-primary-dark",
                )}
              >
                {v == null ? "Sin respuesta" : `${label(v)} (${v})`}
                {risk ? " · Reactivo de atención prioritaria" : ""}
              </Text>
            </View>
          );
        })}
      </View>

      {ins.id === PHQ9.id && app.dificultad_funcional != null ? (
        <View className="rounded-nf-sm border border-border p-2.5">
          <Text className="font-sans text-[13px] leading-5 text-ink">
            {PHQ9_DIFICULTAD.pregunta}
          </Text>
          <Text className="font-sans text-[13px] font-semibold text-primary-dark">
            {PHQ9_DIFICULTAD.opciones.find(
              (o) => o.valor === app.dificultad_funcional,
            )?.label ?? app.dificultad_funcional}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de evaluación                                               */
/* ------------------------------------------------------------------ */
function EvaluationCard({
  e: base,
  onChanged,
  onMessage,
}: {
  e: Evaluation;
  onChanged: () => void;
  onMessage: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Evaluation | null>(null);
  const [apps, setApps] = useState<EvaluationApplication[] | null>(null);
  const [appsError, setAppsError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Detalle consolidado y respuestas, solo al abrir la tarjeta.
  useEffect(() => {
    if (!open || apps) return;
    let alive = true;
    evaluationsApi
      .get(Number(base.id_evaluacion))
      .then((d) => alive && setDetail(d))
      .catch(() => {});
    evaluationsApi
      .applications(Number(base.id_evaluacion))
      .then((a) => alive && setApps(a))
      .catch((err) => {
        if (!alive) return;
        setAppsError(
          err?.response?.status === 404
            ? "El detalle por reactivo no está disponible (falta el endpoint del backend)."
            : errMsg(err, "No se pudo cargar el detalle de respuestas"),
        );
        setApps([]);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const e = { ...base, ...(detail ?? {}) } as Evaluation;
  const alert = hasAlert(e);

  const act = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    setError("");
    try {
      await fn();
      onMessage(msg);
      setApps(null); // se vuelve a cargar si se reabre
      setDetail(null);
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(errMsg(err, "No fue posible completar la acción"));
    } finally {
      setBusy(null);
    }
  };

  const review = () =>
    act(
      "review",
      () => evaluationsApi.review(Number(e.id_evaluacion)),
      "La evaluación se marcó como revisada.",
    );

  const closeIncomplete = async () => {
    const ok = await confirmAsync(
      "Cerrar evaluación",
      "Se cerrará como incompleta: el paciente ya no podrá continuarla y deberá iniciar otra.",
      "Cerrar evaluación",
      "Volver",
    );
    if (!ok) return;
    await act(
      "close",
      () => evaluationsApi.closeIncomplete(Number(e.id_evaluacion)),
      "La evaluación se cerró como incompleta.",
    );
  };

  return (
    <Card className={cn("gap-3", alert && "border-danger")}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((v) => !v)}
        className="gap-2"
      >
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="font-sans text-base font-semibold text-ink">
            {e.paciente ?? `Paciente #${e.id_paciente}`}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {alert ? <Pill text="Alerta prioritaria" tone="danger" /> : null}
            {e.requiere_revision ? (
              <Pill text="Por revisar" tone="warn" />
            ) : null}
            <Pill
              text={ESTADO[e.estado]}
              tone={e.estado === 2 ? "ok" : "muted"}
            />
          </View>
        </View>
        <Muted>
          {e.num_control_o_num_empleado
            ? `${e.num_control_o_num_empleado} · `
            : ""}
          {e.tipo_persona
            ? `${TIPO[e.tipo_persona.trim()] ?? e.tipo_persona.trim()} · `
            : ""}
          Inicio {formatDateTime(e.fecha_inicio)}
          {e.fecha_cierre ? ` · Cierre ${formatDateTime(e.fecha_cierre)}` : ""}
        </Muted>
        <View className="flex-row flex-wrap gap-2">
          <Score ins={PSS14} puntaje={e.pss14_puntaje} nivel={e.pss14_nivel} />
          <Score ins={GAD7} puntaje={e.gad7_puntaje} nivel={e.gad7_nivel} />
          <Score ins={PHQ9} puntaje={e.phq9_puntaje} nivel={e.phq9_nivel} />
        </View>
        {!open ? <Muted>Toca para ver el detalle de respuestas</Muted> : null}
      </Pressable>

      {open ? (
        <View className="gap-4 border-t border-border pt-3">
          {alert ? (
            <Text className="rounded-nf-sm bg-red-50 p-3 font-sans text-sm text-danger">
              El paciente marcó una respuesta de atención prioritaria (PHQ-9,
              reactivo 9). Revisa su caso a la brevedad.
            </Text>
          ) : null}

          {apps === null ? (
            <Muted>Cargando respuestas…</Muted>
          ) : appsError ? (
            <Text className="font-sans text-sm text-danger">{appsError}</Text>
          ) : (
            INSTRUMENTS.map((ins) => (
              <InstrumentAnswers key={ins.id} ins={ins} apps={apps} />
            ))
          )}

          <Muted>
            Los puntajes y niveles son orientativos y no constituyen un
            diagnóstico clínico.
          </Muted>

          {e.fecha_revision ? (
            <Muted>Revisada el {formatDateTime(e.fecha_revision)}.</Muted>
          ) : null}
          {error ? (
            <Text className="font-sans text-sm text-danger">{error}</Text>
          ) : null}

          <View className="flex-row flex-wrap gap-2">
            {e.requiere_revision ? (
              <Button
                title="Marcar como revisada"
                variant="success"
                loading={busy === "review"}
                onPress={() => void review()}
              />
            ) : null}
            {e.estado === 1 ? (
              <Button
                title="Cerrar como incompleta"
                variant="secondary"
                loading={busy === "close"}
                onPress={() => void closeIncomplete()}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Evaluations() {
  const { user } = useAuth();
  const id = user!.userId;

  const [view, setView] = useState<View_>("pendientes");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  // "Por revisar" usa el filtro del backend; el resto filtra en pantalla.
  const q = useLoad<Evaluation[]>(
    () => evaluationsApi.byPsychologist(id, view === "pendientes"),
    [id, view === "pendientes"],
  );
  // Conteos de referencia (siempre sobre todas las evaluaciones).
  const all = useLoad<Evaluation[]>(
    () => evaluationsApi.byPsychologist(id, false),
    [id],
  );

  const refresh = () => {
    void q.reload();
    void all.reload();
  };

  if (q.loading && !q.data && !all.data) return <Loading />;

  const base = all.data ?? [];
  const counts = {
    todas: base.length,
    pendientes: base.filter((e) => e.requiere_revision).length,
    alerta: base.filter(hasAlert).length,
    revisadas: base.filter((e) => e.fecha_revision).length,
  };

  const list = (q.data ?? [])
    .filter((e) =>
      view === "alerta"
        ? hasAlert(e)
        : view === "revisadas"
          ? !!e.fecha_revision
          : true,
    )
    .filter((e) =>
      `${e.paciente ?? ""} ${e.num_control_o_num_empleado ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    );

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[760px] gap-5">
          <View className="gap-1">
            <H1>Evaluaciones</H1>
            <Muted>
              Resultados de tus pacientes asignados (PSS-14, GAD-7 y PHQ-9),
              primero las que tienen alerta prioritaria.
            </Muted>
          </View>

          {message ? (
            <Text className="rounded-nf-sm bg-primary-light p-3 font-sans text-sm text-primary-dark">
              {message}
            </Text>
          ) : null}

          <View className="gap-3">
            <Choice
              value={view}
              onChange={(v) => {
                setView(v);
                setMessage("");
              }}
              options={[
                {
                  value: "pendientes" as View_,
                  label: `Por revisar (${counts.pendientes})`,
                },
                {
                  value: "alerta" as View_,
                  label: `Con alerta (${counts.alerta})`,
                },
                {
                  value: "revisadas" as View_,
                  label: `Revisadas (${counts.revisadas})`,
                },
                { value: "todas" as View_, label: `Todas (${counts.todas})` },
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

          {q.loading && !q.data ? (
            <Loading />
          ) : list.length === 0 ? (
            <EmptyState
              message={
                view === "pendientes"
                  ? "No tienes evaluaciones por revisar."
                  : "No hay evaluaciones con estos filtros."
              }
            />
          ) : (
            list.map((e) => (
              <EvaluationCard
                key={String(e.id_evaluacion)}
                e={e}
                onChanged={refresh}
                onMessage={setMessage}
              />
            ))
          )}
        </View>
      </Screen>
    </>
  );
}
