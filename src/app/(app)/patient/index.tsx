import { appointmentsApi } from "@/api/appointments";
import { assignmentsApi } from "@/api/assignments";
import { evaluationsApi } from "@/api/evaluations";
import { patientsApi } from "@/api/patients";
import { psychologistsApi } from "@/api/psychologists";
import { ChatFab } from "@/components/chat/chat-fab";
import { AvailabilityCalendar } from "@/components/dashboard/availability-calendar";
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
import { INSTRUMENTS } from "@/lib/instruments";
import type { Appointment, Evaluation, Psychologist } from "@/types/api";
import { router } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";

const TIPO: Record<string, string> = {
  A: "Alumno",
  D: "Docente",
  PA: "Personal administrativo",
};
const ESTADO_CITA: Record<number, string> = {
  1: "Solicitada",
  2: "Confirmada",
};

type Profile = {
  nombre: string;
  correo: string;
  numControlOEmpleado: string;
  tipoPersona: string;
};
type Assigned = {
  id_psicologo: number;
  psicologo: string;
  especialidad: string | null;
  correo: string;
  fecha_inicio: string;
} | null;

/** Un fallo en una sección no debe tumbar el resto del panel. */
const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(
    new Date(iso),
  );

const hasResults = (e: Evaluation) =>
  e.pss14_puntaje != null || e.gad7_puntaje != null || e.phq9_puntaje != null;

function Avatar({ name }: { name: string }) {
  return (
    <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-light">
      <Text className="font-sans text-base font-semibold text-primary-dark">
        {initials(name)}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Evaluaciones                                                        */
/* ------------------------------------------------------------------ */
function EvaluationsSection({ evaluations }: { evaluations: Evaluation[] }) {
  const open = () => router.push("/(app)/patient/evaluations");

  const valid = evaluations
    .filter((e) => e.estado !== 4)
    .sort(
      (a, b) =>
        new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime(),
    );
  const inProgress = valid.find((e) => e.estado === 1);
  const done = valid.find(hasResults);

  // Sin evaluación hecha: es lo primero que se le recomienda.
  if (!done)
    return (
      <Card className="gap-4 border-primary bg-primary-light p-6">
        <View className="gap-1.5">
          <H2>
            {inProgress
              ? "Continúa tu evaluación"
              : "Empieza con tu evaluación"}
          </H2>
          <Text className="font-sans text-[15px] leading-6 text-ink">
            {inProgress
              ? "Dejaste una evaluación a medias. Retómala donde la dejaste."
              : "Tres cuestionarios breves (PSS-14, GAD-7 y PHQ-9) nos ayudan a entender cómo te sientes. Te toma unos minutos y tus respuestas son confidenciales."}
          </Text>
        </View>
        <Button
          title={inProgress ? "Continuar evaluación" : "Comenzar evaluación"}
          className="self-start"
          onPress={open}
        />
      </Card>
    );

  // Ya la hizo: resumen discreto.
  return (
    <Card className="gap-3 p-4">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-1">
          <Text className="font-sans text-sm font-semibold text-ink">
            Tu última evaluación
          </Text>
          <Muted>
            {formatDateTime(done.fecha_inicio)}
            {done.fecha_revision ? " · revisada por tu psicólogo" : ""}
          </Muted>
        </View>
        <Button
          title={inProgress ? "Continuar evaluación" : "Ver evaluaciones"}
          variant="secondary"
          className="min-h-9 px-3 py-1.5"
          onPress={open}
        />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {INSTRUMENTS.map((ins) => {
          const key = ins.codigo.toLowerCase();
          const puntaje = (done as any)[`${key}_puntaje`] as number | null;
          const nivel = (done as any)[`${key}_nivel`] as number | null;
          return (
            <View
              key={ins.codigo}
              className={cn(
                "min-w-[30%] flex-1 rounded-nf-sm border border-border px-3 py-2",
                puntaje == null && "opacity-60",
              )}
            >
              <Text className="font-sans text-xs text-muted">{ins.corto}</Text>
              <Text className="font-sans text-sm font-semibold text-ink">
                {puntaje == null ? "—" : puntaje}
                {puntaje != null && ins.niveles.length > 0 && nivel != null
                  ? ` · ${ins.niveles[nivel]}`
                  : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function PatientDashboard() {
  const { user } = useAuth();
  const userId = user!.userId;

  const q = useLoad(async () => {
    const [profile, evaluations, citas, assigned, psychologists] =
      await Promise.all([
        safe<Profile | null>(patientsApi.get(userId) as Promise<Profile>, null),
        safe(evaluationsApi.byPatient(userId), [] as Evaluation[]),
        safe(appointmentsApi.byPatient(userId), [] as Appointment[]),
        safe<Assigned>(
          assignmentsApi.current(userId) as Promise<Assigned>,
          null,
        ),
        safe(psychologistsApi.list(false), [] as Psychologist[]),
      ]);
    return { profile, evaluations, citas, assigned, psychologists };
  }, [userId]);

  const data = q.data;
  const citas = data?.citas ?? [];
  const own = useMemo(
    () =>
      citas
        .filter((c) => c.estado === 1 || c.estado === 2)
        .map((c) => ({ inicio: c.inicio, fin: c.fin })),
    [citas],
  );

  if (q.loading && !data) return <Loading />;
  if (!data)
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

  const { profile, evaluations, assigned, psychologists } = data;
  const psy = assigned
    ? psychologists.find((p) => p.id_psicologo === assigned.id_psicologo)
    : undefined;
  const nextCita = [...citas]
    .filter(
      (c) =>
        (c.estado === 1 || c.estado === 2) &&
        new Date(c.inicio).getTime() > Date.now(),
    )
    .sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
    )[0];

  return (
    <View className="flex-1">
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[760px] gap-5">
          {/* Perfil */}
          <Card className="flex-row items-center gap-4 p-5">
            <Avatar name={profile?.nombre ?? user!.correo} />
            <View className="flex-1">
              <H1 className="text-2xl" numberOfLines={1}>
                {profile?.nombre ?? "Mi espacio"}
              </H1>
              <Muted numberOfLines={1}>
                {profile
                  ? `${TIPO[profile.tipoPersona?.trim()] ?? profile.tipoPersona} · ${profile.numControlOEmpleado}`
                  : "Evaluaciones, citas y acompañamiento."}
              </Muted>
              <Muted numberOfLines={1}>{profile?.correo ?? user!.correo}</Muted>
            </View>
          </Card>

          {/* Evaluaciones */}
          <EvaluationsSection evaluations={evaluations} />

          {/* Citas */}
          <Card className="gap-4">
            <H2>Citas disponibles</H2>
            {nextCita ? (
              <View className="rounded-nf-sm border border-border bg-background p-3">
                <Text className="font-sans text-sm font-semibold text-ink">
                  Tu próxima cita
                </Text>
                <Muted>
                  {formatDateTime(nextCita.inicio)}
                  {nextCita.psicologo ? ` · ${nextCita.psicologo}` : ""} ·{" "}
                  {ESTADO_CITA[nextCita.estado]}
                </Muted>
              </View>
            ) : null}

            {assigned && psy ? (
              <AvailabilityCalendar
                psychologistId={assigned.id_psicologo}
                duracion={psy.duracion_cita_minutos}
                own={own}
                onOpen={() => router.push("/(app)/patient/appointments")}
              />
            ) : (
              <Muted>
                {assigned
                  ? "Tu psicólogo no tiene el calendario disponible por ahora."
                  : "Elige a un psicólogo al agendar tu primera cita: quedará como el tuyo y aquí verás su calendario."}
              </Muted>
            )}

            <View className="flex-row flex-wrap gap-2">
              <Button
                title="Agendar cita"
                onPress={() => router.push("/(app)/patient/appointments")}
              />
              <Button
                title="Mis citas"
                variant="secondary"
                onPress={() => router.push("/(app)/patient/appointments")}
              />
            </View>
          </Card>

          {/* Psicólogo asignado */}
          {assigned ? (
            <Card className="gap-4">
              <H2>Tu psicólogo</H2>
              <View className="flex-row flex-wrap items-center gap-4">
                <Avatar name={assigned.psicologo} />
                <View className="min-w-[200px] flex-1">
                  <Text className="font-sans text-base font-semibold text-ink">
                    {assigned.psicologo}
                  </Text>
                  {assigned.especialidad ? (
                    <Muted>{assigned.especialidad}</Muted>
                  ) : null}
                  <Muted>{assigned.correo}</Muted>
                  <Muted>
                    Asignado desde {formatDate(assigned.fecha_inicio)}
                  </Muted>
                  {psy && psy.chat_disponible === false ? (
                    <Muted>El chat no está disponible por ahora.</Muted>
                  ) : null}
                </View>
                <Button
                  title="Ir al chat privado"
                  onPress={() => router.push("/(app)/patient/chat")}
                />
              </View>
            </Card>
          ) : null}
        </View>
      </Screen>
      {assigned ? <ChatFab href="/(app)/patient/chat" /> : null}
    </View>
  );
}
