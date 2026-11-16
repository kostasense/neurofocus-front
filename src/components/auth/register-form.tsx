import { usersApi } from "@/api/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { H1, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/cn";
import {
    digitsOfInstitutionalEmail,
    isInstitutionalEmail,
} from "@/lib/validators";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

const TIPOS = [
  { v: "A", label: "Alumno" },
  { v: "D", label: "Docente" },
  { v: "PA", label: "Personal administrativo" },
] as const;

type Errors = Partial<
  Record<"nombre" | "correo" | "contrasena" | "numControlOEmpleado", string>
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
      <Button
        title="Registrarme"
        loading={loading}
        onPress={() => void submit()}
      />
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
