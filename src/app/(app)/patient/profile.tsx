import { assignmentsApi } from "@/api/assignments";
import { patientsApi } from "@/api/patients";
import { usersApi } from "@/api/users";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { H1, H2, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Tipos (las respuestas de /patients vienen en camelCase)             */
/* ------------------------------------------------------------------ */
type PatientProfile = {
  idPaciente: number;
  correo: string;
  nombre: string;
  activo: boolean;
  numControlOEmpleado: string;
  tipoPersona: "A" | "D" | "PA";
  fechaNacimiento: string | null; // DATE: "1999-05-10T00:00:00.000Z"
  telefono: string | null;
  telefonoConfianza: string | null;
  contactoPreferido: 1 | 2 | 3 | null;
};

/** Respuesta de PATCH /users/:id (solo se usan nombre y correo). */
type AccountInfo = { nombre: string; correo: string };

type Assigned = {
  id_psicologo: number;
  psicologo: string;
  especialidad: string | null;
  correo: string;
  fecha_inicio: string;
} | null;

type Data = {
  patient: PatientProfile;
  assigned: Assigned;
};

const TIPO: Record<string, string> = {
  A: "Alumno",
  D: "Docente",
  PA: "Personal administrativo",
};
const CONTACTO: Record<number, string> = {
  1: "Correo electrónico",
  2: "Teléfono",
  3: "Notificación en la plataforma",
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

/** tipo_persona es CHAR(2) en la BD y llega con espacio al final ("A "). */
const normalize = (p: PatientProfile): PatientProfile => ({
  ...p,
  tipoPersona: (p.tipoPersona ?? "").trim() as PatientProfile["tipoPersona"],
});

/** DATE sin hora: se toma el texto yyyy-mm-dd sin convertir de zona. */
const dateOnly = (v: string | null) => (v ? v.slice(0, 10) : "");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{10,15}$/;
const cleanPhone = (v: string) => v.replace(/[\s()-]/g, "");

function validBirthDate(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Usa el formato AAAA-MM-DD.";
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  )
    return "La fecha no existe.";
  if (y < 1900) return "Revisa el año de nacimiento.";
  if (date.getTime() > Date.now()) return "La fecha no puede ser futura.";
  return null;
}

/** Estado de guardado independiente por sección. */
function useSaver() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const fail = (m: string) => {
    setOk("");
    setError(m);
  };
  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    setError("");
    setOk("");
    try {
      await fn();
      setOk(okMsg);
    } catch (e) {
      setError(errMsg(e, "No fue posible guardar los cambios"));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, ok, fail, run };
}

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */
function Choice<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T | null;
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

function Feedback({ error, ok }: { error: string; ok: string }) {
  if (error)
    return <Text className="font-sans text-sm text-danger">{error}</Text>;
  if (ok) return <Text className="font-sans text-sm text-success">{ok}</Text>;
  return null;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="font-sans text-sm font-medium text-ink">{label}</Text>
      <View className="min-h-11 justify-center rounded-nf-sm border border-border bg-border/30 px-3.5">
        <Text className="font-sans text-[15px] text-muted">{value}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: cuenta (nombre y correo)                                   */
/* ------------------------------------------------------------------ */
function AccountSection({
  data,
  onSaved,
}: {
  data: Data;
  onSaved: (account: AccountInfo) => void;
}) {
  const p = data.patient;
  const [nombre, setNombre] = useState(p.nombre);
  const [correo, setCorreo] = useState(p.correo);
  const s = useSaver();

  const save = () => {
    const n = nombre.trim();
    const c = correo.trim().toLowerCase();
    if (!n) return s.fail("El nombre no puede estar vacío.");
    if (n.length > 100) return s.fail("El nombre admite hasta 100 caracteres.");
    if (!EMAIL_RE.test(c)) return s.fail("Escribe un correo válido.");

    const dto: Record<string, string> = {};
    if (n !== p.nombre) dto.nombre = n;
    if (c !== p.correo.toLowerCase()) dto.correo = c;
    if (!Object.keys(dto).length) return s.fail("No hay cambios que guardar.");

    void s.run(
      async () => {
        const updated = (await usersApi.update(
          p.idPaciente,
          dto,
        )) as AccountInfo;
        onSaved(updated);
        setNombre(updated.nombre);
        setCorreo(updated.correo);
      },
      dto.correo
        ? "Datos actualizados. Usa el nuevo correo la próxima vez que inicies sesión."
        : "Datos actualizados.",
    );
  };

  return (
    <Card className="gap-4">
      <H2>Cuenta</H2>
      <Input
        label="Nombre"
        value={nombre}
        onChangeText={setNombre}
        maxLength={100}
        autoCapitalize="words"
      />
      <Input
        label="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Muted>El correo es el que usas para iniciar sesión.</Muted>
      <Feedback error={s.error} ok={s.ok} />
      <Button title="Guardar cuenta" loading={s.busy} onPress={save} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: datos personales e institucionales                         */
/* ------------------------------------------------------------------ */
function PersonalSection({
  data,
  onSaved,
}: {
  data: Data;
  onSaved: (p: PatientProfile) => void;
}) {
  const p = data.patient;
  const [fecha, setFecha] = useState(dateOnly(p.fechaNacimiento));
  const s = useSaver();

  const save = () => {
    const f = fecha.trim();
    if (f) {
      const problem = validBirthDate(f);
      if (problem) return s.fail(problem);
    }
    if (f === dateOnly(p.fechaNacimiento))
      return s.fail("No hay cambios que guardar.");

    void s.run(async () => {
      const updated = (await patientsApi.update(p.idPaciente, {
        fechaNacimiento: f || null,
      })) as PatientProfile;
      onSaved(normalize(updated));
    }, "Datos actualizados.");
  };

  return (
    <Card className="gap-4">
      <H2>Datos personales</H2>

      <ReadOnlyField
        label="Tipo de persona"
        value={TIPO[p.tipoPersona] ?? p.tipoPersona}
      />
      <ReadOnlyField
        label={
          p.tipoPersona === "A" ? "Número de control" : "Número de empleado"
        }
        value={p.numControlOEmpleado}
      />
      <Muted>
        Estos datos los registra la institución y no se pueden modificar desde
        aquí. Si hay un error, comunícate con la administración.
      </Muted>

      <Input
        label="Fecha de nacimiento (AAAA-MM-DD)"
        value={fecha}
        onChangeText={setFecha}
        placeholder="2001-04-23"
        maxLength={10}
        keyboardType="numbers-and-punctuation"
      />
      <Muted>Déjala vacía si prefieres no registrarla.</Muted>

      <Feedback error={s.error} ok={s.ok} />
      <Button
        title="Guardar fecha de nacimiento"
        loading={s.busy}
        onPress={save}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: contacto                                                   */
/* ------------------------------------------------------------------ */
function ContactSection({
  data,
  onSaved,
}: {
  data: Data;
  onSaved: (p: PatientProfile) => void;
}) {
  const p = data.patient;
  const [tel, setTel] = useState(p.telefono ?? "");
  const [conf, setConf] = useState(p.telefonoConfianza ?? "");
  const [pref, setPref] = useState<1 | 2 | 3 | null>(p.contactoPreferido);
  const s = useSaver();

  const save = () => {
    const t = cleanPhone(tel);
    const c = cleanPhone(conf);
    if (t && !PHONE_RE.test(t))
      return s.fail(
        "El teléfono debe tener entre 10 y 15 dígitos y puede iniciar con +.",
      );
    if (c && !PHONE_RE.test(c))
      return s.fail(
        "El teléfono de confianza debe tener entre 10 y 15 dígitos y puede iniciar con +.",
      );
    if (pref === 2 && !t)
      return s.fail(
        "Para elegir «Teléfono» como contacto preferido registra tu teléfono.",
      );

    const dto: Record<string, unknown> = {};
    // Para borrar un teléfono el backend espera null (una cadena vacía no es válida).
    if (t !== (p.telefono ?? "")) dto.telefono = t || null;
    if (c !== (p.telefonoConfianza ?? "")) dto.telefonoConfianza = c || null;
    if (pref !== p.contactoPreferido && pref != null)
      dto.contactoPreferido = pref;
    if (!Object.keys(dto).length) return s.fail("No hay cambios que guardar.");

    void s.run(async () => {
      const updated = (await patientsApi.update(
        p.idPaciente,
        dto,
      )) as PatientProfile;
      onSaved(normalize(updated));
      setTel(updated.telefono ?? "");
      setConf(updated.telefonoConfianza ?? "");
    }, "Contacto actualizado.");
  };

  return (
    <Card className="gap-4">
      <H2>Contacto</H2>
      <Muted>
        Tus teléfonos se guardan cifrados. Solo tú y el personal administrador
        pueden consultarlos.
      </Muted>

      <Input
        label="Teléfono"
        value={tel}
        onChangeText={setTel}
        keyboardType="phone-pad"
        placeholder="6671234567"
        maxLength={20}
      />
      <Input
        label="Teléfono de una persona de confianza"
        value={conf}
        onChangeText={setConf}
        keyboardType="phone-pad"
        placeholder="6679876543"
        maxLength={20}
      />
      <Muted>Déjalos vacíos para eliminarlos.</Muted>

      <View className="gap-1.5">
        <Text className="font-sans text-sm font-medium text-ink">
          Medio de contacto preferido
        </Text>
        <Choice
          value={pref}
          onChange={setPref}
          options={[1, 2, 3].map((k) => ({
            value: k as 1 | 2 | 3,
            label: CONTACTO[k],
          }))}
        />
      </View>

      <Feedback error={s.error} ok={s.ok} />
      <Button title="Guardar contacto" loading={s.busy} onPress={save} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: seguridad (contraseña)                                     */
/* ------------------------------------------------------------------ */
function PasswordSection({ userId }: { userId: number }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const s = useSaver();

  const save = () => {
    if (!actual) return s.fail("Escribe tu contraseña actual.");
    if (nueva.length < 8)
      return s.fail("La nueva contraseña debe tener al menos 8 caracteres.");
    if (nueva === actual)
      return s.fail("La nueva contraseña debe ser distinta de la actual.");
    if (nueva !== repetir) return s.fail("Las contraseñas no coinciden.");

    void s.run(async () => {
      await usersApi.changePassword(userId, {
        contrasenaActual: actual,
        contrasenaNueva: nueva,
      });
      setActual("");
      setNueva("");
      setRepetir("");
    }, "Contraseña actualizada.");
  };

  return (
    <Card className="gap-4">
      <H2>Seguridad</H2>
      <PasswordInput
        label="Contraseña actual"
        value={actual}
        onChangeText={setActual}
        autoComplete="current-password"
      />
      <PasswordInput
        label="Nueva contraseña"
        value={nueva}
        onChangeText={setNueva}
        autoComplete="new-password"
      />
      <PasswordInput
        label="Repite la nueva contraseña"
        value={repetir}
        onChangeText={setRepetir}
        autoComplete="new-password"
      />
      <Muted>Mínimo 8 caracteres.</Muted>
      <Feedback error={s.error} ok={s.ok} />
      <Button title="Cambiar contraseña" loading={s.busy} onPress={save} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Profile() {
  const { user } = useAuth();
  const userId = user!.userId;

  const q = useLoad<Data>(async () => {
    const patient = normalize(
      (await patientsApi.get(userId)) as PatientProfile,
    );
    // Complementario: si falla, el perfil se muestra igual.
    const assigned = await (
      assignmentsApi.current(userId) as Promise<Assigned>
    ).catch(() => null);
    return { patient, assigned };
  }, [userId]);
  // Versión local para reflejar lo guardado sin recargar toda la pantalla.
  const [saved, setSaved] = useState<PatientProfile | null>(null);

  if (q.loading && !q.data) return <Loading />;

  if (!q.data) {
    return (
      <>
        <AppHeader />
        <Screen>
          <View className="mx-auto w-full max-w-[640px] gap-4">
            <H1>Mi perfil</H1>
            <Text className="font-sans text-sm text-danger">
              {q.error || "No fue posible cargar tu perfil."}
            </Text>
            <Button title="Reintentar" onPress={() => void q.reload()} />
          </View>
        </Screen>
      </>
    );
  }

  const data: Data = {
    patient: saved ?? q.data.patient,
    assigned: q.data.assigned,
  };

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[640px] gap-5">
          <View className="gap-1">
            <H1>Mi perfil</H1>
            <Muted>Consulta y actualiza tus datos de cuenta y contacto.</Muted>
          </View>

          <Card className="gap-2">
            <H2>Mi psicólogo</H2>
            {data.assigned ? (
              <>
                <Text className="font-sans font-semibold text-ink">
                  {data.assigned.psicologo}
                </Text>
                <Muted>
                  {data.assigned.especialidad ?? "Sin especialidad registrada"}{" "}
                  · desde {formatDate(data.assigned.fecha_inicio)}
                </Muted>
                <Button
                  title="Ver mis citas"
                  variant="secondary"
                  className="mt-2 self-start"
                  onPress={() => router.push("/(app)/patient/appointments")}
                />
              </>
            ) : (
              <>
                <Muted>
                  Aún no tienes un psicólogo asignado. Se asigna al agendar tu
                  primera cita o por parte de la administración.
                </Muted>
                <Button
                  title="Agendar una cita"
                  variant="secondary"
                  className="mt-2 self-start"
                  onPress={() => router.push("/(app)/patient/appointments")}
                />
              </>
            )}
          </Card>

          <AccountSection
            data={data}
            onSaved={(account) =>
              setSaved({
                ...(saved ?? q.data!.patient),
                nombre: account.nombre,
                correo: account.correo,
              })
            }
          />
          <PersonalSection
            data={data}
            onSaved={(patient) => setSaved(patient)}
          />
          <ContactSection
            data={data}
            onSaved={(patient) => setSaved(patient)}
          />
          <PasswordSection userId={userId} />
        </View>
      </Screen>
    </>
  );
}
