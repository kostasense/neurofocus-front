import { appointmentsApi } from "@/api/appointments";
import { psychologistsApi } from "@/api/psychologists";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { AccountSection } from "@/components/profile/account-section";
import { PasswordSection } from "@/components/profile/password-section";
import { Feedback, ReadOnlyField, useSaver } from "@/components/profile/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H1, H2, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { confirmAsync } from "@/lib/confirm";
import type { Appointment, Psychologist } from "@/types/api";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

const DURACIONES = [30, 45, 50, 60, 90];
const MIN_DURACION = 10;
const MAX_DURACION = 240;

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */
function Choice<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5",
              on ? "border-primary bg-primary" : "border-border bg-surface",
              disabled && "opacity-60",
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

type SectionProps = {
  psy: Psychologist;
  /** Citas solicitadas o confirmadas que todavía no ocurren. */
  futuras: number;
  onSaved: (p: Psychologist) => void;
};

/* ------------------------------------------------------------------ */
/* Sección: datos profesionales                                        */
/* ------------------------------------------------------------------ */
function ProfessionalSection({ psy, onSaved }: SectionProps) {
  const [especialidad, setEspecialidad] = useState(psy.especialidad ?? "");
  const s = useSaver();

  const save = () => {
    const v = especialidad.trim();
    if (v === (psy.especialidad ?? ""))
      return s.fail("No hay cambios que guardar.");
    if (!v) return s.fail("Escribe tu especialidad.");
    if (v.length > 120)
      return s.fail("La especialidad admite hasta 120 caracteres.");

    void s.run(async () => {
      const updated = (await psychologistsApi.update(psy.id_psicologo, {
        especialidad: v,
      })) as Psychologist;
      onSaved(updated);
      setEspecialidad(updated.especialidad ?? v);
    }, "Datos profesionales actualizados.");
  };

  return (
    <Card className="gap-4">
      <H2>Datos profesionales</H2>
      <ReadOnlyField
        label="Cédula profesional"
        value={psy.cedula_profesional}
      />
      <Muted>
        La cédula la gestiona la administración. Si necesitas corregirla,
        solicítalo con ellos.
      </Muted>
      <Input
        label="Especialidad"
        value={especialidad}
        onChangeText={setEspecialidad}
        maxLength={120}
      />
      <Feedback error={s.error} ok={s.ok} />
      <Button title="Guardar datos" loading={s.busy} onPress={save} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: duración de las citas                                      */
/* ------------------------------------------------------------------ */
function DurationSection({ psy, futuras, onSaved }: SectionProps) {
  const actual = psy.duracion_cita_minutos;
  const [sel, setSel] = useState<number | "otra">(
    DURACIONES.includes(actual) ? actual : "otra",
  );
  const [otra, setOtra] = useState(
    DURACIONES.includes(actual) ? "" : String(actual),
  );
  const s = useSaver();

  const nueva = sel === "otra" ? Number(otra) : sel;

  const save = async () => {
    if (
      !Number.isInteger(nueva) ||
      nueva < MIN_DURACION ||
      nueva > MAX_DURACION
    )
      return s.fail(
        `La duración debe ser un número entero entre ${MIN_DURACION} y ${MAX_DURACION} minutos.`,
      );
    if (nueva === actual) return s.fail("No hay cambios que guardar.");

    const ok = await confirmAsync(
      "Cambiar duración de las citas",
      futuras > 0
        ? `Tus ${futuras} cita(s) futuras conservan su duración actual. Los horarios que se ofrezcan desde ahora serán de ${nueva} min y una cita reprogramada tomará la nueva duración. Tus bloques de horario no cambian.`
        : `Los horarios que se ofrezcan desde ahora serán de ${nueva} min. Tus bloques de horario no cambian.`,
      "Cambiar duración",
      "Volver",
    );
    if (!ok) return;

    void s.run(async () => {
      const updated = (await psychologistsApi.update(psy.id_psicologo, {
        duracionCitaMinutos: nueva,
      })) as Psychologist;
      onSaved(updated);
    }, `Listo. Los nuevos horarios serán de ${nueva} min.`);
  };

  return (
    <Card className="gap-4">
      <H2>Duración de las citas</H2>
      <Choice<number | "otra">
        value={sel}
        onChange={setSel}
        options={[
          ...DURACIONES.map((d) => ({
            value: d as number | "otra",
            label: `${d} min`,
          })),
          { value: "otra" as number | "otra", label: "Otra" },
        ]}
      />
      {sel === "otra" ? (
        <Input
          label={`Minutos (${MIN_DURACION} a ${MAX_DURACION})`}
          value={otra}
          onChangeText={(t) => setOtra(t.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          maxLength={3}
        />
      ) : null}
      <Muted>
        Duración actual: {actual} min. Cada bloque de horario se divide en citas
        de esta duración. Cambiarla no modifica tus bloques ni las citas ya
        agendadas.
        {futuras > 0 ? ` Tienes ${futuras} cita(s) futuras.` : ""}
      </Muted>
      <Feedback error={s.error} ok={s.ok} />
      <Button
        title="Guardar duración"
        loading={s.busy}
        onPress={() => void save()}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: disponibilidad                                             */
/* ------------------------------------------------------------------ */
function AvailabilitySection({ psy, futuras, onSaved }: SectionProps) {
  const citas = useSaver();
  const chat = useSaver();

  const setCitas = async (v: boolean) => {
    if (v === psy.activo_para_citas) return;
    if (!v) {
      const ok = await confirmAsync(
        "Dejar de recibir citas nuevas",
        `Los pacientes ya no podrán agendar contigo.${
          futuras > 0 ? ` Tus ${futuras} cita(s) futuras siguen vigentes.` : ""
        } Puedes volver a activarlo cuando quieras.`,
        "Dejar de recibir",
        "Volver",
      );
      if (!ok) return;
    }
    void citas.run(
      async () => {
        const updated = (await psychologistsApi.setAppointments(
          psy.id_psicologo,
          v,
        )) as Psychologist;
        onSaved(updated);
      },
      v ? "Ahora recibes citas nuevas." : "Ya no recibes citas nuevas.",
    );
  };

  const setChat = (v: boolean) => {
    if (v === psy.chat_disponible) return;
    void chat.run(
      async () => {
        const updated = (await psychologistsApi.setChat(
          psy.id_psicologo,
          v,
        )) as Psychologist;
        onSaved(updated);
      },
      v ? "El chat quedó disponible." : "El chat quedó no disponible.",
    );
  };

  return (
    <Card className="gap-5">
      <H2>Disponibilidad</H2>

      <View className="gap-2">
        <Text className="font-sans text-sm font-medium text-ink">
          Recibir citas nuevas
        </Text>
        <Choice
          value={psy.activo_para_citas ? 1 : 0}
          disabled={citas.busy}
          onChange={(v) => void setCitas(v === 1)}
          options={[
            { value: 1, label: "Sí" },
            { value: 0, label: "No" },
          ]}
        />
        <Muted>
          Si lo desactivas, los pacientes no te verán para agendar. Las citas
          que ya tienes no se afectan.
        </Muted>
        <Feedback error={citas.error} ok={citas.ok} />
      </View>

      <View className="gap-2">
        <Text className="font-sans text-sm font-medium text-ink">
          Chat disponible
        </Text>
        <Choice
          value={psy.chat_disponible ? 1 : 0}
          disabled={chat.busy}
          onChange={(v) => setChat(v === 1)}
          options={[
            { value: 1, label: "Sí" },
            { value: 0, label: "No" },
          ]}
        />
        <Muted>
          Interruptor general del chat. Además, cada conversación se habilita
          por paciente desde el módulo de chat.
        </Muted>
        <Feedback error={chat.error} ok={chat.ok} />
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: horarios y zona horaria                                    */
/* ------------------------------------------------------------------ */
function ScheduleInfo() {
  let zona = "tu zona horaria";
  try {
    zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* sin Intl */
  }
  return (
    <Card className="gap-3">
      <H2>Horarios</H2>
      <Muted>
        Tus bloques de atención se escriben en la hora de tu dispositivo ({zona}
        ) y cada paciente los ve en la suya. Si cambias de zona o tu país cambia
        de horario de verano, vuelve a guardar tus bloques.
      </Muted>
      <Button
        title="Administrar bloques de horario"
        variant="secondary"
        className="self-start"
        onPress={() => router.push("/(app)/psychologist/agenda")}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Profile() {
  const { user } = useAuth();
  const userId = user!.userId;

  const q = useLoad(async () => {
    const [psy, citas] = await Promise.all([
      psychologistsApi.get(userId) as Promise<Psychologist>,
      appointmentsApi
        .byPsychologist(userId, new Date().toISOString())
        .catch(() => [] as Appointment[]),
    ]);
    const now = Date.now();
    const futuras = citas.filter(
      (c) =>
        (c.estado === 1 || c.estado === 2) &&
        new Date(c.inicio).getTime() > now,
    ).length;
    return { psy, futuras };
  }, [userId]);

  const [saved, setSaved] = useState<Psychologist | null>(null);

  if (q.loading && !q.data) return <Loading />;
  if (!q.data)
    return (
      <>
        <AppHeader />
        <Screen>
          <Text className="font-sans text-sm text-danger">
            {q.error || "No se pudo cargar tu perfil."}
          </Text>
        </Screen>
      </>
    );

  const psy = saved ?? q.data.psy;
  const props: SectionProps = {
    psy,
    futuras: q.data.futuras,
    onSaved: setSaved,
  };

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[650px] gap-6">
          <View className="gap-1">
            <H1>Mi perfil</H1>
            <Muted>
              Tus datos de cuenta y de atención. Los de identidad profesional
              los gestiona la administración.
            </Muted>
          </View>

          <AccountSection
            userId={userId}
            nombre={psy.nombre}
            correo={psy.correo}
            onSaved={(a) =>
              setSaved({ ...psy, nombre: a.nombre, correo: a.correo })
            }
          />
          <ProfessionalSection {...props} />
          <DurationSection {...props} />
          <AvailabilitySection {...props} />
          <ScheduleInfo />
          <PasswordSection userId={userId} />
        </View>
      </Screen>
    </>
  );
}
