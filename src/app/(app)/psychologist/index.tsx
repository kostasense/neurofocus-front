import { appointmentsApi } from "@/api/appointments";
import { chatApi } from "@/api/chat";
import { evaluationsApi } from "@/api/evaluations";
import { psychologistsApi } from "@/api/psychologists";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, H2, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type {
  Appointment,
  DashboardPatient,
  Evaluation,
  PanicAlert,
  Psychologist,
} from "@/types/api";
import { Href, router } from "expo-router";
import { Pressable, Text, View } from "react-native";

const ESTADO_CITA: Record<number, string> = {
  1: "Solicitada",
  2: "Confirmada",
  3: "Realizada",
  4: "Cancelada",
  5: "No asistió",
  6: "Reprogramada",
};
const MODALIDAD: Record<number, string> = { 1: "Presencial", 2: "Virtual" };
const DAYS_AHEAD = 14;
const LIST_MAX = 6;

const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const when = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const day = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(
    new Date(iso),
  );

const go = (href: Href) => router.push(href);

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

function Stat({
  label,
  value,
  tone,
  onPress,
}: {
  label: string;
  value: number;
  tone?: "danger";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "min-w-[45%] flex-1 rounded-nf border bg-surface p-4 active:opacity-80",
        tone === "danger" && value > 0 ? "border-danger" : "border-border",
      )}
    >
      <Text
        className={cn(
          "font-serif text-3xl font-medium",
          tone === "danger" && value > 0 ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </Text>
      <Muted>{label}</Muted>
    </Pressable>
  );
}

function SectionHeader({
  title,
  actionLabel,
  href,
}: {
  title: string;
  actionLabel: string;
  href: Href;
}) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <H2>{title}</H2>
      <Pressable accessibilityRole="link" onPress={() => go(href)} hitSlop={8}>
        <Text className="font-sans text-sm text-primary underline">
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const QUICK: { label: string; href: Href }[] = [
  { label: "Pacientes", href: "/(app)/psychologist/patients" },
  { label: "Agenda", href: "/(app)/psychologist/agenda" },
  { label: "Evaluaciones", href: "/(app)/psychologist/evaluations" },
  { label: "Expedientes", href: "/(app)/psychologist/records" },
  { label: "Chat", href: "/(app)/psychologist/chat" },
  { label: "Alertas", href: "/(app)/psychologist/alerts" },
];

export default function PsychDashboard() {
  const { user } = useAuth();
  const userId = user!.userId;

  const q = useLoad(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + DAYS_AHEAD * 86_400_000);
    const [psy, patients, citas, pending, alerts] = await Promise.all([
      safe<Psychologist | null>(
        psychologistsApi.get(userId) as Promise<Psychologist>,
        null,
      ),
      safe(
        psychologistsApi.dashboardPatients(userId),
        [] as DashboardPatient[],
      ),
      safe(
        appointmentsApi.dashboard(
          userId,
          start.toISOString(),
          end.toISOString(),
        ),
        [] as Appointment[],
      ),
      safe(evaluationsApi.byPsychologist(userId, true), [] as Evaluation[]),
      safe(chatApi.alerts(), [] as PanicAlert[]),
    ]);
    return { psy, patients, citas, pending, alerts, start, end };
  }, [userId]);

  if (q.loading && !q.data) return <Loading />;
  if (!q.data)
    return (
      <>
        <AppHeader />
        <Screen>
          <Text className="font-sans text-sm text-danger">
            {q.error || "No se pudo cargar tu panel."}
          </Text>
        </Screen>
      </>
    );

  const { psy, patients, pending, alerts } = q.data;
  const now = Date.now();
  const endOfToday = new Date(q.data.start.getTime() + 86_400_000).getTime();

  const active = [...q.data.citas]
    .filter(
      (c) =>
        (c.estado === 1 || c.estado === 2) && new Date(c.fin).getTime() > now,
    )
    .sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
    );
  const today = active.filter((c) => new Date(c.inicio).getTime() < endOfToday);
  const activeAlerts = alerts.filter((a) => a.estado < 4);

  const byNextVisit = [...patients].sort((a, b) => {
    const x = a.proxima_cita ? new Date(a.proxima_cita).getTime() : Infinity;
    const y = b.proxima_cita ? new Date(b.proxima_cita).getTime() : Infinity;
    return x - y;
  });

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="gap-5">
          {/* Perfil */}
          <Card className="gap-3 p-5">
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-light">
                <Text className="font-sans text-base font-semibold text-primary-dark">
                  {initials(psy?.nombre ?? user!.correo)}
                </Text>
              </View>
              <View className="flex-1">
                <H1 className="text-2xl" numberOfLines={1}>
                  {psy?.nombre ?? "Panel profesional"}
                </H1>
                <Muted numberOfLines={1}>
                  {psy
                    ? `${psy.especialidad ?? "Psicología"} · Cédula ${psy.cedula_profesional}`
                    : "Pacientes, agenda y seguimiento."}
                </Muted>
                <Muted numberOfLines={1}>{psy?.correo ?? user!.correo}</Muted>
              </View>
            </View>
            {psy ? (
              <View className="flex-row flex-wrap gap-2">
                <Pill
                  text={
                    psy.activo_para_citas
                      ? "Recibe citas nuevas"
                      : "No recibe citas nuevas"
                  }
                  tone={psy.activo_para_citas ? "ok" : "warn"}
                />
                <Pill
                  text={
                    psy.chat_disponible
                      ? "Chat disponible"
                      : "Chat no disponible"
                  }
                  tone={psy.chat_disponible ? "ok" : "warn"}
                />
                <Pill text={`Citas de ${psy.duracion_cita_minutos} min`} />
              </View>
            ) : null}
          </Card>

          {/* Alertas de pánico */}
          {activeAlerts.length > 0 ? (
            <Card className="flex-row flex-wrap items-center justify-between gap-3 border-danger p-4">
              <View className="flex-1">
                <Text className="font-sans text-[15px] font-semibold text-danger">
                  {activeAlerts.length === 1
                    ? "Hay 1 alerta de pánico activa"
                    : `Hay ${activeAlerts.length} alertas de pánico activas`}
                </Text>
                <Muted>
                  {activeAlerts[0].paciente}
                  {activeAlerts.length > 1
                    ? ` y ${activeAlerts.length - 1} más`
                    : ""}{" "}
                  · {when(activeAlerts[0].fecha_alerta)}
                </Muted>
              </View>
              <Button
                title="Ver alertas"
                variant="danger"
                onPress={() => go("/(app)/psychologist/alerts")}
              />
            </Card>
          ) : null}

          {/* Resumen */}
          <View className="flex-row flex-wrap gap-3">
            <Stat
              label="Citas hoy"
              value={today.length}
              onPress={() => go("/(app)/psychologist/agenda")}
            />
            <Stat
              label="Pacientes asignados"
              value={patients.length}
              onPress={() => go("/(app)/psychologist/patients")}
            />
            <Stat
              label="Evaluaciones por revisar"
              value={pending.length}
              onPress={() => go("/(app)/psychologist/evaluations")}
            />
            <Stat
              label="Alertas activas"
              value={activeAlerts.length}
              tone="danger"
              onPress={() => go("/(app)/psychologist/alerts")}
            />
          </View>

          <View className="gap-5 md:flex-row md:items-start">
            {/* Próximas citas (vista vw_DashboardPsicologoCitas) */}
            <Card className="flex-1 gap-3">
              <SectionHeader
                title="Próximas citas"
                actionLabel="Abrir agenda"
                href="/(app)/psychologist/agenda"
              />
              {active.length === 0 ? (
                <Muted>
                  No tienes citas en los próximos {DAYS_AHEAD} días.
                </Muted>
              ) : (
                <View className="gap-2">
                  {active.slice(0, LIST_MAX).map((c) => (
                    <Pressable
                      key={String(c.id_cita)}
                      accessibilityRole="button"
                      onPress={() => go("/(app)/psychologist/agenda")}
                      className="gap-0.5 rounded-nf-sm border border-border p-3 active:opacity-80"
                    >
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="flex-1 font-sans text-sm font-semibold capitalize text-ink">
                          {when(c.inicio)}
                        </Text>
                        <Pill
                          text={ESTADO_CITA[c.estado]}
                          tone={c.estado === 2 ? "ok" : "warn"}
                        />
                      </View>
                      <Muted>
                        {c.paciente ?? `Paciente ${c.id_paciente}`} ·{" "}
                        {MODALIDAD[c.modalidad]}
                      </Muted>
                    </Pressable>
                  ))}
                  {active.length > LIST_MAX ? (
                    <Muted>
                      y {active.length - LIST_MAX} más en tu agenda.
                    </Muted>
                  ) : null}
                </View>
              )}
            </Card>

            {/* Pacientes (vista vw_DashboardPsicologoPacientes) */}
            <Card className="flex-1 gap-3">
              <SectionHeader
                title="Pacientes"
                actionLabel="Ver todos"
                href="/(app)/psychologist/patients"
              />
              {byNextVisit.length === 0 ? (
                <Muted>Aún no tienes pacientes asignados.</Muted>
              ) : (
                <View className="gap-2">
                  {byNextVisit.slice(0, LIST_MAX).map((p) => (
                    <Pressable
                      key={p.id_paciente}
                      accessibilityRole="button"
                      onPress={() => go("/(app)/psychologist/patients")}
                      className="gap-0.5 rounded-nf-sm border border-border p-3 active:opacity-80"
                    >
                      <Text className="font-sans text-sm font-semibold text-ink">
                        {p.paciente}
                      </Text>
                      <Muted>
                        {p.proxima_cita
                          ? `Próxima cita: ${when(p.proxima_cita)}`
                          : "Sin cita próxima"}
                        {p.fecha_ultima_evaluacion
                          ? ` · Evaluación ${day(p.fecha_ultima_evaluacion)}`
                          : " · Sin evaluaciones"}
                      </Muted>
                    </Pressable>
                  ))}
                  {byNextVisit.length > LIST_MAX ? (
                    <Muted>y {byNextVisit.length - LIST_MAX} más.</Muted>
                  ) : null}
                </View>
              )}
            </Card>
          </View>

          {/* Evaluaciones por revisar */}
          <Card className="gap-3">
            <SectionHeader
              title="Evaluaciones por revisar"
              actionLabel="Ver evaluaciones"
              href="/(app)/psychologist/evaluations"
            />
            {pending.length === 0 ? (
              <Muted>No tienes evaluaciones pendientes de revisión.</Muted>
            ) : (
              <View className="gap-2">
                {pending.slice(0, 4).map((e) => (
                  <Pressable
                    key={String(e.id_evaluacion)}
                    accessibilityRole="button"
                    onPress={() => go("/(app)/psychologist/evaluations")}
                    className="flex-row items-center justify-between gap-2 rounded-nf-sm border border-border p-3 active:opacity-80"
                  >
                    <View className="flex-1">
                      <Text className="font-sans text-sm font-semibold text-ink">
                        {e.paciente ?? `Paciente ${e.id_paciente}`}
                      </Text>
                      <Muted>{formatDateTime(e.fecha_inicio)}</Muted>
                    </View>
                    {Number(e.alerta_prioritaria) === 1 ? (
                      <Pill text="Alerta prioritaria" tone="danger" />
                    ) : null}
                  </Pressable>
                ))}
                {pending.length > 4 ? (
                  <Muted>y {pending.length - 4} más.</Muted>
                ) : null}
              </View>
            )}
          </Card>

          {/* Accesos */}
          <View className="flex-row flex-wrap gap-2">
            {QUICK.map((l) => (
              <Pressable
                key={l.label}
                accessibilityRole="link"
                onPress={() => go(l.href)}
                className="rounded-full border border-border bg-surface px-4 py-2 active:border-primary"
              >
                <Text className="font-sans text-sm text-ink">{l.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Screen>
    </>
  );
}
