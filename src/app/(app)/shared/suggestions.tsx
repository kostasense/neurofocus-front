import { appointmentsApi } from "@/api/appointments";
import { psychologistsApi } from "@/api/psychologists";
import { suggestionsApi } from "@/api/suggestions";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H1, H2, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { Appointment, Psychologist, Suggestion } from "@/types/api";
import { ROLES } from "@/types/routes";
import { ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Catálogos                                                           */
/* ------------------------------------------------------------------ */
const CATEGORIA: Record<number, string> = {
  1: "Sistema",
  2: "Atención psicológica",
  3: "Citas",
  4: "Privacidad",
  5: "Otro",
};
const ESTADO: Record<number, string> = {
  1: "Recibida",
  2: "En revisión",
  3: "Atendida",
  4: "Cerrada",
};
const ESTADO_CITA: Record<number, string> = {
  1: "Solicitada",
  2: "Confirmada",
  3: "Realizada",
  4: "Cancelada",
  5: "No asistió",
  6: "Reprogramada",
};
const MAX_COMENTARIO = 2000;

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

const stars = (n: number | null | undefined) =>
  n == null ? "Sin calificación" : "★".repeat(n) + "☆".repeat(5 - n);

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

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans text-sm font-medium text-ink">{label}</Text>
      {children}
      {hint ? <Muted>{hint}</Muted> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Suggestions() {
  const { user } = useAuth();
  const isPatient = user?.rol === ROLES.PATIENT;

  const psy = useLoad<Psychologist[]>(() => psychologistsApi.list(false));
  const citas = useLoad<Appointment[]>(
    async () =>
      isPatient && user ? await appointmentsApi.byPatient(user.userId) : [],
    [user?.userId, isPatient],
  );
  const mine = useLoad<Suggestion[]>(
    () => suggestionsApi.mine() as Promise<Suggestion[]>,
  );

  const [anonima, setAnonima] = useState(false);
  const [categoria, setCategoria] = useState<number>(5);
  const [calificacion, setCalificacion] = useState<number>(0); // 0 = sin calificar
  const [psicologoId, setPsicologoId] = useState<number>(0);
  const [citaId, setCitaId] = useState<number>(0);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const psicologos = psy.data ?? [];
  const recientes = [...(citas.data ?? [])]
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime())
    .slice(0, 10);
  const citaSel = citaId
    ? recientes.find((c) => Number(c.id_cita) === citaId)
    : undefined;
  // Si hay cita, el psicólogo referido es el de esa cita (el backend lo exige).
  const psicologoEfectivo = citaSel ? citaSel.id_psicologo : psicologoId;
  const nombrePsicologo =
    citaSel?.psicologo ??
    psicologos.find((p) => p.id_psicologo === psicologoEfectivo)?.nombre;

  const send = async () => {
    setError("");
    setOk("");
    if (!comentario.trim()) return setError("Escribe un comentario.");
    if (categoria === 2 && !psicologoEfectivo)
      return setError(
        "Para una sugerencia de atención psicológica indica el psicólogo al que se refiere.",
      );

    const dto: Record<string, unknown> = {
      anonima,
      categoria,
      comentario: comentario.trim(),
    };
    if (calificacion) dto.calificacion = calificacion;
    if (psicologoEfectivo) dto.idPsicologoReferido = psicologoEfectivo;
    if (citaId && !anonima) dto.idCita = citaId;

    setBusy(true);
    try {
      await suggestionsApi.create(dto);
      setOk(
        anonima
          ? "Gracias. Tu sugerencia anónima fue registrada; no aparecerá en tu historial."
          : "Gracias. Tu sugerencia fue registrada.",
      );
      setComentario("");
      setCalificacion(0);
      setPsicologoId(0);
      setCitaId(0);
      setCategoria(5);
      void mine.reload();
    } catch (e) {
      setError(errMsg(e, "No fue posible enviar la sugerencia"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[650px] gap-6">
          <View className="gap-1">
            <H1>Buzón de sugerencias</H1>
            <Muted>
              Comparte comentarios generales sin información clínica: no
              incluyas diagnósticos ni datos de tus sesiones.
            </Muted>
          </View>

          <Card className="gap-5">
            <Group
              label="¿Cómo quieres enviarla?"
              hint={
                anonima
                  ? "No se guardará tu identidad ni la cita relacionada, y no podrás consultarla después."
                  : "Quedará asociada a tu cuenta y podrás ver su avance abajo."
              }
            >
              <Choice<number>
                value={anonima ? 1 : 0}
                onChange={(v) => {
                  setAnonima(v === 1);
                  if (v === 1) setCitaId(0);
                }}
                options={[
                  { value: 0, label: "Identificada" },
                  { value: 1, label: "Anónima" },
                ]}
              />
            </Group>

            <Group label="Categoría">
              <Choice
                value={categoria}
                onChange={setCategoria}
                options={Object.entries(CATEGORIA).map(([k, label]) => ({
                  value: Number(k),
                  label,
                }))}
              />
            </Group>

            <Group label="Calificación (opcional)">
              <Choice
                value={calificacion}
                onChange={setCalificacion}
                options={[
                  { value: 0, label: "Sin calificar" },
                  ...[1, 2, 3, 4, 5].map((n) => ({
                    value: n,
                    label: `${n} ★`,
                  })),
                ]}
              />
            </Group>

            {isPatient && !anonima && recientes.length > 0 ? (
              <Group
                label="Cita relacionada (opcional)"
                hint="Solo tus citas más recientes. Se tomará también el psicólogo de esa cita."
              >
                <Choice
                  value={citaId}
                  onChange={setCitaId}
                  options={[
                    { value: 0, label: "Ninguna" },
                    ...recientes.map((c) => ({
                      value: Number(c.id_cita),
                      label: `${formatDateTime(c.inicio)} · ${c.psicologo ?? "Psicólogo"} · ${ESTADO_CITA[c.estado]}`,
                    })),
                  ]}
                />
              </Group>
            ) : null}

            {citaSel ? (
              <Group label="Psicólogo referido">
                <Text className="font-sans text-[15px] text-ink">
                  {nombrePsicologo ?? `Psicólogo ${psicologoEfectivo}`}
                </Text>
              </Group>
            ) : psicologos.length > 0 ? (
              <Group
                label={
                  categoria === 2
                    ? "Psicólogo referido (obligatorio)"
                    : "Psicólogo referido (opcional)"
                }
              >
                <Choice
                  value={psicologoId}
                  onChange={setPsicologoId}
                  options={[
                    { value: 0, label: "Ninguno" },
                    ...psicologos.map((p) => ({
                      value: p.id_psicologo,
                      label: p.nombre,
                    })),
                  ]}
                />
              </Group>
            ) : null}

            <View className="gap-1">
              <Input
                label="Comentario"
                multiline
                numberOfLines={6}
                maxLength={MAX_COMENTARIO}
                value={comentario}
                onChangeText={setComentario}
                style={{
                  minHeight: 140,
                  textAlignVertical: "top",
                  paddingTop: 10,
                }}
              />
              <Text className="text-right font-sans text-xs text-muted">
                {comentario.length}/{MAX_COMENTARIO}
              </Text>
            </View>

            {error ? (
              <Text className="font-sans text-sm text-danger">{error}</Text>
            ) : null}
            {ok ? (
              <Text className="font-sans text-sm text-success">{ok}</Text>
            ) : null}

            <Button
              title="Enviar sugerencia"
              loading={busy}
              onPress={() => void send()}
            />
          </Card>

          <View className="gap-3">
            <H2>Mis sugerencias</H2>
            <Muted>
              Solo aparecen las enviadas de forma identificada. La respuesta
              interna de administración no es visible para quien la envía.
            </Muted>
            {mine.error ? (
              <Text className="font-sans text-sm text-danger">
                {mine.error}
              </Text>
            ) : null}
            {!mine.loading && (mine.data ?? []).length === 0 ? (
              <EmptyState message="Aún no has enviado sugerencias identificadas." />
            ) : (
              (mine.data ?? []).map((s) => (
                <Card key={String(s.id_sugerencia)} className="gap-2">
                  <View className="flex-row flex-wrap items-center justify-between gap-2">
                    <Text className="font-sans font-semibold text-ink">
                      {CATEGORIA[s.categoria]}
                    </Text>
                    <Text
                      className={cn(
                        "rounded-nf-sm px-2 py-0.5 font-sans text-xs",
                        s.estado >= 3
                          ? "bg-primary-light text-primary-dark"
                          : "bg-border text-muted",
                      )}
                    >
                      {ESTADO[s.estado]}
                    </Text>
                  </View>
                  <Text className="font-sans text-[15px] leading-6 text-ink">
                    {s.comentario}
                  </Text>
                  <Muted>
                    {formatDateTime(s.fecha_creacion)} · {stars(s.calificacion)}
                    {s.psicologo_referido
                      ? ` · Sobre ${s.psicologo_referido}`
                      : ""}
                  </Muted>
                  {s.fecha_atencion ? (
                    <Muted>
                      Atendida el {formatDateTime(s.fecha_atencion)}
                    </Muted>
                  ) : null}
                </Card>
              ))
            )}
          </View>
        </View>
      </Screen>
    </>
  );
}
