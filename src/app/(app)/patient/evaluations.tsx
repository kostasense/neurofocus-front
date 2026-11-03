import { evaluationsApi } from "@/api/evaluations";
import { EmptyState } from "@/components/feedback/empty-state";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, H2, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { confirmAsync } from "@/lib/confirm";
import { clearDraft, loadDraft, saveDraft } from "@/lib/evaluation-draft";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  answeredCount,
  Answers,
  CONTACTOS_PRIORITARIOS,
  emptyAnswers,
  Instrument,
  INSTRUMENTS,
  isComplete,
  PHQ9_DIFICULTAD,
} from "@/lib/instruments";
import type { Evaluation } from "@/types/api";
import { router, useNavigation } from "expo-router";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Catálogos y utilidades                                              */
/* ------------------------------------------------------------------ */
const ESTADO_EVAL: Record<number, string> = {
  1: "En curso",
  2: "Completa",
  3: "Cerrada incompleta",
  4: "Anulada",
};

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

const httpStatus = (e: any): number | undefined => e?.response?.status;

/** Resultado de un instrumento tomado de la vista consolidada de la evaluación. */
function resultOf(ev: Evaluation, ins: Instrument) {
  const e = ev as any;
  const key = ins.codigo.toLowerCase();
  return {
    puntaje: e[`${key}_puntaje`] as number | null,
    nivel: e[`${key}_nivel`] as number | null,
  };
}

/**
 * Garantiza que existan las aplicaciones de los tres instrumentos y devuelve el id
 * de las que siguen en proceso. `startInstrument` es idempotente: si la aplicación
 * ya está en proceso devuelve la existente; si ya fue completada o abandonada
 * responde 409 y se omite (null).
 */
async function ensureApplications(
  evaluationId: number,
): Promise<Record<number, number | null>> {
  const out: Record<number, number | null> = {};
  for (const ins of INSTRUMENTS) {
    try {
      const app = await evaluationsApi.start(evaluationId, ins.id);
      out[ins.id] = app.estado === 1 ? Number(app.id_aplicacion) : null;
    } catch (e) {
      if (httpStatus(e) === 409) out[ins.id] = null;
      else throw e;
    }
  }
  return out;
}

/** Cancela una evaluación abierta: abandona sus aplicaciones y la cierra incompleta. */
async function cancelEvaluation(userId: number, evaluationId: number) {
  try {
    const apps = await ensureApplications(evaluationId);
    for (const id of Object.values(apps)) {
      if (!id) continue;
      try {
        await evaluationsApi.abandon(id);
      } catch {
        /* ya no estaba en proceso */
      }
    }
  } catch {
    /* si falla, el cierre de abajo deja la evaluación fuera de curso */
  }
  try {
    await evaluationsApi.closeIncomplete(evaluationId);
  } catch {
    /* ya estaba cerrada */
  }
  await clearDraft(userId);
}

/* ------------------------------------------------------------------ */
/* Piezas visuales                                                     */
/* ------------------------------------------------------------------ */
function Pill({
  text,
  tone,
}: {
  text: string;
  tone?: "ok" | "warn" | "danger";
}) {
  return (
    <Text
      className={cn(
        "rounded-nf-sm px-2 py-0.5 font-sans text-xs",
        tone === "ok"
          ? "bg-primary-light text-primary-dark"
          : tone === "warn"
            ? "bg-warning/15 text-warning"
            : tone === "danger"
              ? "bg-danger/15 text-danger"
              : "bg-border text-muted",
      )}
    >
      {text}
    </Text>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "info" | "warn" | "danger";
  children: ReactNode;
}) {
  return (
    <View
      className={cn(
        "rounded-nf-sm border p-3",
        tone === "danger"
          ? "border-danger bg-danger/10"
          : tone === "warn"
            ? "border-warning bg-warning/10"
            : "border-border bg-primary-light",
      )}
    >
      {children}
    </View>
  );
}

function Progress({
  step,
  total,
  title,
}: {
  step: number;
  total: number;
  title: string;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans text-sm font-semibold text-ink">
          {title}
        </Text>
        <Text className="font-sans text-xs text-muted">
          Paso {step} de {total}
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-primary-light">
        <View
          className="h-2 rounded-full bg-primary"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </View>
    </View>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 rounded-nf-sm border px-3 py-2.5 active:opacity-80",
        selected
          ? "border-primary bg-primary-light"
          : "border-border bg-surface",
      )}
    >
      <View
        className={cn(
          "h-5 w-5 items-center justify-center rounded-full border-2",
          selected ? "border-primary" : "border-border",
        )}
      >
        {selected ? (
          <View className="h-2.5 w-2.5 rounded-full bg-primary" />
        ) : null}
      </View>
      <Text
        className={cn(
          "flex-1 font-sans text-[15px] text-ink",
          selected && "font-semibold",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Question({
  n,
  text,
  options,
  value,
  missing,
  onChange,
}: {
  n: number;
  text: string;
  options: { valor: number; label: string }[];
  value: number | undefined;
  missing: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <Card className={cn("gap-3", missing && "border-danger")}>
      <Text className="font-sans text-[15px] leading-6 text-ink">
        <Text className="font-semibold">{n}. </Text>
        {text}
      </Text>
      <View className="gap-2">
        {options.map((o) => (
          <OptionRow
            key={o.valor}
            label={o.label}
            selected={value === o.valor}
            onPress={() => onChange(o.valor)}
          />
        ))}
      </View>
      {missing ? (
        <Text className="font-sans text-xs text-danger">
          Selecciona una respuesta.
        </Text>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Resultado                                                           */
/* ------------------------------------------------------------------ */
function ResultView({ ev, onBack }: { ev: Evaluation; onBack: () => void }) {
  const alerta = ev.alerta_prioritaria === 1;
  return (
    <View className="gap-5">
      <View className="gap-1">
        <H1>Resultado de tu evaluación</H1>
        <Muted>
          {formatDateTime(ev.fecha_inicio)} · {ESTADO_EVAL[ev.estado]}
        </Muted>
      </View>

      <Notice tone="info">
        <Text className="font-sans text-sm text-ink">
          Este resultado es preventivo y no constituye un diagnóstico. No
          sustituye la valoración de un profesional de la psicología.
        </Text>
      </Notice>

      {alerta ? (
        <Notice tone="danger">
          <Text className="font-sans text-sm font-semibold text-ink">
            Tus respuestas indican que podrías necesitar atención prioritaria.
          </Text>
          <Text className="mt-1 font-sans text-sm text-ink">
            Un profesional de psicología revisará tu evaluación. Si en este
            momento sientes que estás en riesgo, busca apoyo de inmediato con
            una persona de confianza o acude al servicio de psicología de tu
            institución.
          </Text>
          {CONTACTOS_PRIORITARIOS.map((c) => (
            <Text key={c.nombre} className="mt-1 font-sans text-sm text-ink">
              <Text className="font-semibold">{c.nombre}: </Text>
              {c.detalle}
            </Text>
          ))}
        </Notice>
      ) : null}

      <View className="gap-3">
        {INSTRUMENTS.map((ins) => {
          const r = resultOf(ev, ins);
          return (
            <Card key={ins.codigo} className="gap-1">
              <Text className="font-sans font-semibold text-ink">
                {ins.nombre}
              </Text>
              {r.puntaje == null ? (
                <Muted>Sin resultado: este instrumento no se completó.</Muted>
              ) : (
                <>
                  <Text className="font-serif text-3xl text-ink">
                    {r.puntaje}
                    <Text className="font-sans text-base text-muted">
                      {" "}
                      / {ins.puntajeMax}
                    </Text>
                  </Text>
                  {ins.niveles.length > 0 && r.nivel != null ? (
                    <Text className="font-sans text-sm text-ink">
                      Nivel orientativo: {ins.niveles[r.nivel]}
                    </Text>
                  ) : (
                    <Muted>
                      Esta escala no define niveles; una puntuación mayor indica
                      mayor estrés percibido.
                    </Muted>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </View>

      <Muted>
        Tu psicólogo asignado, si lo tienes, podrá consultar este resultado.
      </Muted>

      <View className="flex-row flex-wrap gap-3">
        {ev.estado === 2 ? (
          <Button
            title="Solicitar una cita"
            onPress={() => router.push("/(app)/patient/appointments")}
          />
        ) : null}
        <Button
          title="Volver a mis evaluaciones"
          variant="secondary"
          onPress={onBack}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
type Mode = "list" | "intro" | "wizard" | "result";
const LAST_PAGE = INSTRUMENTS.length + 1; // 1..3 instrumentos, 4 revisión

export default function Evaluations() {
  const { user } = useAuth();
  const userId = user!.userId;
  const navigation = useNavigation();

  const q = useLoad<Evaluation[]>(
    () => evaluationsApi.byPatient(userId),
    [userId],
  );

  const [mode, setMode] = useState<Mode>("list");
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers());
  const [dificultad, setDificultad] = useState<number | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const scrollRef = useRef<ScrollView>(null);
  /** Id de la evaluación mientras hay una sesión de respuesta activa (sin pausar ni terminar). */
  const activeRef = useRef<number | null>(null);
  const leavingRef = useRef(false);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Al cambiar de página, volver al inicio del contenido.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [mode, page]);

  /* ---------- Abandono de la página: cancelar la evaluación ---------- */
  useEffect(() => {
    // Salir con un gesto o botón de regreso: pedir confirmación.
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (leavingRef.current || activeRef.current == null) return;
      e.preventDefault();
      void confirmAsync(
        "¿Salir de la evaluación?",
        "Si sales ahora sin guardar, la evaluación se cancelará. Usa «Guardar y continuar después» si quieres retomarla más tarde.",
        "Salir y cancelar",
        "Seguir respondiendo",
      ).then((ok) => {
        if (!ok) return;
        leavingRef.current = true; // evita volver a preguntar al reenviar la acción
        navigation.dispatch(e.data.action);
      });
    });

    // Cerrar o recargar la pestaña (web): solo se puede advertir; la evaluación
    // queda abierta y se puede retomar o cancelar desde la lista.
    const onBeforeUnload = (e: any) => {
      if (activeRef.current == null) return;
      e.preventDefault();
      e.returnValue = "";
    };
    if (Platform.OS === "web" && typeof window !== "undefined")
      window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      unsubscribe();
      if (Platform.OS === "web" && typeof window !== "undefined")
        window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [navigation]);

  // Desmontaje con una sesión activa = se abandonó la página: cancelar la evaluación.
  // (Efecto aparte y sin dependencias para que solo corra al salir de la pantalla.)
  useEffect(() => {
    return () => {
      const id = activeRef.current;
      activeRef.current = null;
      if (id != null) void cancelEvaluation(userIdRef.current, id);
    };
  }, []);

  /* ---------- Acciones ---------- */
  const enterWizard = (
    id: number,
    a: Answers,
    d: number | null,
    startPage: number,
  ) => {
    activeRef.current = id;
    setEvaluationId(id);
    setAnswers(a);
    setDificultad(d);
    setPage(startPage);
    setShowMissing(false);
    setError("");
    setMode("wizard");
  };

  const begin = async () => {
    setBusy("begin");
    setError("");
    setInfo("");
    try {
      let ev: Evaluation | undefined;
      try {
        ev = await evaluationsApi.create();
      } catch (e) {
        if (httpStatus(e) !== 409) throw e;
        // Ya hay una abierta: continuar con esa.
        ev = (await evaluationsApi.byPatient(userId)).find(
          (x) => x.estado === 1,
        );
      }
      if (!ev) throw new Error("No se encontró la evaluación abierta");
      const id = Number(ev.id_evaluacion);
      await ensureApplications(id);
      await clearDraft(userId);
      enterWizard(id, emptyAnswers(), null, 1);
    } catch (e) {
      setError(errMsg(e, "No fue posible iniciar la evaluación"));
      setMode("list");
    } finally {
      setBusy(null);
    }
  };

  const resume = async (ev: Evaluation) => {
    setBusy("resume");
    setError("");
    setInfo("");
    const id = Number(ev.id_evaluacion);
    const draft = await loadDraft(userId);
    const valid =
      draft && String(draft.evaluationId) === String(ev.id_evaluacion);
    enterWizard(
      id,
      valid ? draft!.answers : emptyAnswers(),
      valid ? draft!.dificultad : null,
      valid ? Math.min(Math.max(draft!.page, 1), LAST_PAGE) : 1,
    );
    if (!valid)
      setInfo(
        "No encontramos respuestas guardadas en este dispositivo; empieza de nuevo esta evaluación.",
      );
    setBusy(null);
  };

  const pause = async () => {
    if (evaluationId == null) return;
    setBusy("pause");
    setError("");
    try {
      await saveDraft(userId, {
        evaluationId: String(evaluationId),
        answers,
        dificultad,
        page,
        savedAt: new Date().toISOString(),
      });
      activeRef.current = null; // pausada: no se cancela al salir
      setInfo(
        "Guardamos tu avance en este dispositivo. Puedes continuar después desde esta pantalla.",
      );
      setMode("list");
      await q.reload();
    } catch (e) {
      setError(errMsg(e, "No fue posible guardar tu avance"));
    } finally {
      setBusy(null);
    }
  };

  const cancelCurrent = async (id: number) => {
    const ok = await confirmAsync(
      "¿Cancelar la evaluación?",
      "Se cerrará sin resultados y tendrás que empezar una nueva si quieres completarla.",
      "Cancelar evaluación",
      "Volver",
    );
    if (!ok) return;
    setBusy("cancel");
    activeRef.current = null;
    await cancelEvaluation(userId, id);
    setBusy(null);
    setMode("list");
    setInfo("La evaluación fue cancelada.");
    await q.reload();
  };

  const submitAll = async () => {
    if (evaluationId == null) return;
    if (INSTRUMENTS.some((i) => !isComplete(i, answers))) {
      setShowMissing(true);
      return setError("Faltan reactivos por responder.");
    }
    const ok = await confirmAsync(
      "¿Enviar la evaluación?",
      "Después de enviarla no podrás modificar tus respuestas.",
      "Enviar",
      "Revisar",
    );
    if (!ok) return;

    setBusy("submit");
    setError("");
    try {
      const apps = await ensureApplications(evaluationId);
      for (const ins of INSTRUMENTS) {
        const appId = apps[ins.id];
        if (!appId) continue; // ya enviado en un intento anterior
        const respuestas = ins.preguntas.map((_, i) => ({
          numeroReactivo: i + 1,
          valor: answers[ins.id][i + 1],
        }));
        const hayMalestar = Object.values(answers[3] ?? {}).some((v) => v > 0);
        await evaluationsApi.submit(appId, {
          respuestas,
          ...(ins.id === 3 && hayMalestar && dificultad != null
            ? { dificultadFuncional: dificultad }
            : {}),
        });
      }
      const final = await evaluationsApi.get(evaluationId);
      activeRef.current = null;
      await clearDraft(userId);
      setResult(final);
      setMode("result");
      await q.reload();
    } catch (e) {
      setError(
        `${errMsg(e, "No fue posible enviar la evaluación")}. Tus respuestas siguen aquí; puedes intentar de nuevo.`,
      );
    } finally {
      setBusy(null);
    }
  };

  const setAnswer = (ins: Instrument, n: number, v: number) =>
    setAnswers((prev) => ({ ...prev, [ins.id]: { ...prev[ins.id], [n]: v } }));

  const goNext = (ins: Instrument) => {
    if (!isComplete(ins, answers)) {
      setShowMissing(true);
      return setError("Responde todos los reactivos para continuar.");
    }
    setShowMissing(false);
    setError("");
    setPage((p) => p + 1);
  };

  const goBack = () => {
    setShowMissing(false);
    setError("");
    setPage((p) => Math.max(1, p - 1));
  };

  /* ---------- Vistas ---------- */
  const list = q.data ?? [];
  const open = list.find((x) => x.estado === 1);
  const history = list.filter((x) => x.estado !== 1);

  let body: ReactNode;

  if (mode === "result" && result) {
    body = (
      <ResultView
        ev={result}
        onBack={() => {
          setResult(null);
          setMode("list");
        }}
      />
    );
  } else if (mode === "intro") {
    body = (
      <View className="gap-5">
        <View className="gap-1">
          <H1>Evaluación de bienestar</H1>
          <Muted>
            Tres cuestionarios breves de autorreporte, en una sola evaluación.
          </Muted>
        </View>

        {INSTRUMENTS.map((ins) => (
          <Card key={ins.codigo} className="gap-1">
            <Text className="font-sans font-semibold text-ink">
              {ins.nombre}
            </Text>
            <Text className="font-sans text-sm text-ink">{ins.mide}</Text>
            <Muted>
              {ins.preguntas.length} reactivos · {ins.periodo}
            </Muted>
          </Card>
        ))}

        <Notice tone="info">
          <Text className="font-sans text-sm leading-5 text-ink">
            • Los resultados son preventivos y no constituyen un diagnóstico.
            {"\n"}• Cada instrumento se puntúa por separado; no se combinan en
            un índice único.
            {"\n"}• Puedes guardar tu avance y continuar después en este
            dispositivo.
            {"\n"}• Si sales de la pantalla sin guardar, la evaluación se
            cancela.
            {"\n"}• Tu psicólogo asignado, si lo tienes, podrá consultar tus
            resultados.
          </Text>
        </Notice>

        {error ? (
          <Text className="font-sans text-sm text-danger">{error}</Text>
        ) : null}

        <View className="flex-row flex-wrap gap-3">
          <Button
            title="Comenzar"
            loading={busy === "begin"}
            onPress={() => void begin()}
          />
          <Button
            title="Volver"
            variant="secondary"
            onPress={() => setMode("list")}
          />
        </View>
      </View>
    );
  } else if (mode === "wizard") {
    const ins = page <= INSTRUMENTS.length ? INSTRUMENTS[page - 1] : null;
    const hayMalestar = Object.values(answers[3] ?? {}).some((v) => v > 0);

    body = (
      <View className="gap-5">
        <Progress
          step={page}
          total={LAST_PAGE}
          title={ins ? ins.nombre : "Revisión y envío"}
        />

        {info ? (
          <Notice tone="info">
            <Text className="font-sans text-sm text-ink">{info}</Text>
          </Notice>
        ) : null}

        {ins ? (
          <>
            <View className="gap-1">
              <Text className="font-sans text-sm leading-5 text-ink">
                {ins.instrucciones}
              </Text>
              <Muted>
                Respondidos: {answeredCount(ins, answers)} de{" "}
                {ins.preguntas.length}
              </Muted>
            </View>

            {ins.preguntas.map((text, i) => (
              <Question
                key={i}
                n={i + 1}
                text={text}
                options={ins.opciones}
                value={answers[ins.id][i + 1]}
                missing={showMissing && answers[ins.id][i + 1] === undefined}
                onChange={(v) => setAnswer(ins, i + 1, v)}
              />
            ))}

            {ins.id === 3 && hayMalestar ? (
              <Card className="gap-3">
                <Text className="font-sans text-[15px] leading-6 text-ink">
                  {PHQ9_DIFICULTAD.pregunta}
                </Text>
                <View className="gap-2">
                  {PHQ9_DIFICULTAD.opciones.map((o) => (
                    <OptionRow
                      key={o.valor}
                      label={o.label}
                      selected={dificultad === o.valor}
                      onPress={() => setDificultad(o.valor)}
                    />
                  ))}
                </View>
                <Muted>Esta pregunta es opcional.</Muted>
              </Card>
            ) : null}
          </>
        ) : (
          <>
            <Muted>
              Revisa que hayas respondido todo. Después de enviar no podrás
              modificar tus respuestas.
            </Muted>
            {INSTRUMENTS.map((i, idx) => {
              const done = isComplete(i, answers);
              return (
                <Card
                  key={i.codigo}
                  className={cn(
                    "gap-2",
                    showMissing && !done && "border-danger",
                  )}
                >
                  <View className="flex-row flex-wrap items-center justify-between gap-2">
                    <Text className="font-sans font-semibold text-ink">
                      {i.corto}
                    </Text>
                    <Pill
                      text={`${answeredCount(i, answers)} de ${i.preguntas.length}`}
                      tone={done ? "ok" : "warn"}
                    />
                  </View>
                  {!done ? (
                    <Button
                      title="Completar"
                      variant="secondary"
                      className="min-h-9 self-start px-3 py-1.5"
                      onPress={() => setPage(idx + 1)}
                    />
                  ) : null}
                </Card>
              );
            })}
          </>
        )}

        {error ? (
          <Text className="font-sans text-sm text-danger">{error}</Text>
        ) : null}

        <View className="flex-row flex-wrap gap-3">
          {page > 1 ? (
            <Button title="Anterior" variant="secondary" onPress={goBack} />
          ) : null}
          {ins ? (
            <Button title="Siguiente" onPress={() => goNext(ins)} />
          ) : (
            <Button
              title="Enviar evaluación"
              variant="success"
              loading={busy === "submit"}
              onPress={() => void submitAll()}
            />
          )}
        </View>

        <View className="flex-row flex-wrap gap-3 border-t border-border pt-4">
          <Button
            title="Guardar y continuar después"
            variant="secondary"
            loading={busy === "pause"}
            onPress={() => void pause()}
          />
          <Button
            title="Cancelar evaluación"
            variant="danger"
            loading={busy === "cancel"}
            onPress={() =>
              evaluationId != null && void cancelCurrent(evaluationId)
            }
          />
        </View>
        <Muted>
          El avance guardado se conserva solo en este dispositivo. Si sales de
          la pantalla sin guardar, la evaluación se cancela.
        </Muted>
      </View>
    );
  } else {
    // Lista
    body = (
      <View className="gap-5">
        <View className="gap-1">
          <H1>Mis evaluaciones</H1>
          <Muted>
            Evaluaciones de bienestar con tres instrumentos: PSS-14, GAD-7 y
            PHQ-9.
          </Muted>
        </View>

        {info ? (
          <Notice tone="info">
            <Text className="font-sans text-sm text-ink">{info}</Text>
          </Notice>
        ) : null}
        {error ? (
          <Text className="font-sans text-sm text-danger">{error}</Text>
        ) : null}
        {q.error ? (
          <Text className="font-sans text-sm text-danger">{q.error}</Text>
        ) : null}

        {open ? (
          <Card className="gap-3 border-primary">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="font-sans font-semibold text-ink">
                Evaluación en curso
              </Text>
              <Pill text="Pendiente de completar" tone="warn" />
            </View>
            <Muted>Iniciada el {formatDateTime(open.fecha_inicio)}</Muted>
            <View className="flex-row flex-wrap gap-3">
              <Button
                title="Continuar"
                loading={busy === "resume"}
                onPress={() => void resume(open)}
              />
              <Button
                title="Cancelar evaluación"
                variant="secondary"
                loading={busy === "cancel"}
                onPress={() => void cancelCurrent(Number(open.id_evaluacion))}
              />
            </View>
          </Card>
        ) : (
          <Button
            title="Nueva evaluación"
            className="self-start"
            onPress={() => {
              setInfo("");
              setError("");
              setMode("intro");
            }}
          />
        )}

        <View className="gap-3">
          <H2>Historial</H2>
          {q.loading && !q.data ? (
            <Loading />
          ) : history.length === 0 ? (
            <EmptyState message="Aún no tienes evaluaciones terminadas." />
          ) : (
            history.map((ev) => (
              <Card key={String(ev.id_evaluacion)} className="gap-2">
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <Text className="font-sans font-semibold text-ink">
                    {formatDate(ev.fecha_inicio)}
                  </Text>
                  <Pill
                    text={ESTADO_EVAL[ev.estado]}
                    tone={ev.estado === 2 ? "ok" : undefined}
                  />
                </View>
                {ev.estado !== 4 ? (
                  <View className="gap-0.5">
                    {INSTRUMENTS.map((ins) => {
                      const r = resultOf(ev, ins);
                      return (
                        <Muted key={ins.codigo}>
                          {ins.corto}:{" "}
                          {r.puntaje == null
                            ? "sin resultado"
                            : `${r.puntaje} / ${ins.puntajeMax}${
                                ins.niveles.length && r.nivel != null
                                  ? ` · ${ins.niveles[r.nivel]}`
                                  : ""
                              }`}
                        </Muted>
                      );
                    })}
                  </View>
                ) : null}
                {ev.estado !== 4 ? (
                  <Button
                    title="Ver resultado"
                    variant="secondary"
                    className="min-h-9 self-start px-3 py-1.5"
                    onPress={() => {
                      setResult(ev);
                      setMode("result");
                    }}
                  />
                ) : null}
              </Card>
            ))
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <AppHeader />
      <Screen scroll={false}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-auto w-full max-w-[720px]">{body}</View>
        </ScrollView>
      </Screen>
    </>
  );
}
