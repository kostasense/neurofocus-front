import { usersApi } from "@/api/users";
import { LegalModal } from "@/components/auth/legal-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { H1, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/cn";
import {
  AVISO_PRIVACIDAD,
  CONSENTIMIENTO,
  LEGAL_VERSION,
  type LegalDoc,
} from "@/lib/legal";
import {
  digitsOfInstitutionalEmail,
  isInstitutionalEmail,
} from "@/lib/validators";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

const TIPOS = [
  { v: "A", label: "Alumno" },
  { v: "D", label: "Docente" },
  { v: "PA", label: "Personal administrativo" },
] as const;

type Errors = Partial<
  Record<
    "nombre" | "correo" | "contrasena" | "numControlOEmpleado" | "legal",
    string
  >
>;

export function RegisterForm({
  onRegistered,
  onSwitch,
}: {
  onRegistered: (correo: string) => void;
  onSwitch: () => void;
}) {
  const [d, setD] = useState({
    nombre: "",
    correo: "",
    contrasena: "",
    numControlOEmpleado: "",
    tipoPersona: "A" as "A" | "D" | "PA",
  });
  const [consent, setConsent] = useState(false);
  const [aviso, setAviso] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setCorreo = (v: string) => {
    // El número de control coincide con los 8 dígitos del correo: se sugiere si está vacío.
    const digits = digitsOfInstitutionalEmail(v);
    setD((p) => ({
      ...p,
      correo: v,
      numControlOEmpleado:
        !p.numControlOEmpleado && digits ? digits : p.numControlOEmpleado,
    }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!d.nombre.trim()) e.nombre = "Escribe tu nombre.";
    else if (d.nombre.trim().length > 100) e.nombre = "Máximo 100 caracteres.";
    if (!isInstitutionalEmail(d.correo))
      e.correo =
        "Usa tu correo institucional, con el formato L**17****@culiacan.tecnm.mx (por ejemplo L24170001@culiacan.tecnm.mx).";
    if (d.contrasena.length < 8) e.contrasena = "Mínimo 8 caracteres.";
    if (!d.numControlOEmpleado.trim())
      e.numControlOEmpleado = "Escribe tu número de control o de empleado.";
    if (!consent || !aviso)
      e.legal =
        "Para crear tu cuenta debes aceptar el consentimiento informado y el aviso de privacidad.";
    return e;
  };

  const submit = async () => {
    setError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await usersApi.register({
        ...d,
        nombre: d.nombre.trim(),
        correo: d.correo.trim(),
        numControlOEmpleado: d.numControlOEmpleado.trim(),
        aceptaConsentimiento: consent,
        aceptaAviso: aviso,
        versionTextos: LEGAL_VERSION,
      });
      onRegistered(d.correo.trim());
    } catch (err: any) {
      const m = err?.response?.data?.message;
      setError(
        Array.isArray(m)
          ? m.join(" ")
          : (m ?? "No fue posible registrar la cuenta"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="gap-4">
      <View>
        <H1>Crear cuenta</H1>
        <Muted className="mt-1">
          Registro de paciente con tu correo institucional.
        </Muted>
      </View>
      {error ? (
        <Text className="rounded-nf-sm bg-red-50 p-3 text-sm text-danger">
          {error}
        </Text>
      ) : null}
      <Input
        label="Nombre"
        value={d.nombre}
        onChangeText={(v) => setD({ ...d, nombre: v })}
        error={errors.nombre}
      />
      <Input
        label="Correo institucional"
        value={d.correo}
        onChangeText={setCorreo}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="L24170001@culiacan.tecnm.mx"
        error={errors.correo}
      />
      <PasswordInput
        label="Contraseña"
        value={d.contrasena}
        onChangeText={(v) => setD({ ...d, contrasena: v })}
        error={errors.contrasena}
      />
      <Input
        label="Número de control o de empleado"
        value={d.numControlOEmpleado}
        onChangeText={(v) => setD({ ...d, numControlOEmpleado: v })}
        error={errors.numControlOEmpleado}
      />
      <View className="gap-1.5">
        <Text className="font-sans text-sm font-medium text-ink">Tipo</Text>
        <View className="flex-row flex-wrap gap-2">
          {TIPOS.map((t) => {
            const on = d.tipoPersona === t.v;
            return (
              <Pressable
                key={t.v}
                accessibilityRole="button"
                onPress={() => setD({ ...d, tipoPersona: t.v })}
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
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View className="gap-3">
        <LegalCheck
          checked={consent}
          onToggle={() => setConsent((v) => !v)}
          prefix="He leído y acepto el "
          linkText="consentimiento informado"
          onOpen={() => setLegalDoc(CONSENTIMIENTO)}
        />
        <LegalCheck
          checked={aviso}
          onToggle={() => setAviso((v) => !v)}
          prefix="He leído y acepto el "
          linkText="aviso de privacidad"
          onOpen={() => setLegalDoc(AVISO_PRIVACIDAD)}
        />
        {errors.legal ? (
          <Text className="font-sans text-xs text-danger">{errors.legal}</Text>
        ) : null}
      </View>
      <Button
        title="Registrarme"
        loading={loading}
        onPress={() => void submit()}
      />
      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
      <Text
        onPress={onSwitch}
        accessibilityRole="link"
        className="text-center font-sans text-sm text-primary"
      >
        ¿Ya tienes cuenta? Iniciar sesión
      </Text>
    </View>
  );
}

function LegalCheck({
  checked,
  onToggle,
  prefix,
  linkText,
  onOpen,
}: {
  checked: boolean;
  onToggle: () => void;
  prefix: string;
  linkText: string;
  onOpen: () => void;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={prefix + linkText}
        onPress={onToggle}
        hitSlop={8}
        className={cn(
          "mt-0.5 h-5 w-5 items-center justify-center rounded border",
          checked ? "border-primary bg-primary" : "border-border bg-surface",
        )}
      >
        {checked ? <Check size={14} color="white" /> : null}
      </Pressable>
      <Text className="flex-1 font-sans text-sm text-ink">
        {prefix}
        <Text
          accessibilityRole="link"
          onPress={onOpen}
          className="font-semibold text-primary underline"
        >
          {linkText}
        </Text>
        .
      </Text>
    </View>
  );
}
