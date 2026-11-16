import { usersApi } from "@/api/users";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { H2, Muted } from "@/components/ui/typography";
import { useState } from "react";
import { EMAIL_RE, Feedback, useSaver } from "./shared";

export type AccountInfo = { nombre: string; correo: string };

/**
 * Nombre y correo de la propia cuenta. Para cambiar el correo se pide la
 * contraseña actual (el backend también lo exige).
 */
export function AccountSection({
  userId,
  nombre: nombreInicial,
  correo: correoInicial,
  onSaved,
}: {
  userId: number;
  nombre: string;
  correo: string;
  onSaved: (account: AccountInfo) => void;
}) {
  const [saved, setSaved] = useState<AccountInfo>({
    nombre: nombreInicial,
    correo: correoInicial,
  });
  const [nombre, setNombre] = useState(nombreInicial);
  const [correo, setCorreo] = useState(correoInicial);
  const [contrasena, setContrasena] = useState("");
  const s = useSaver();

  const correoCambia =
    correo.trim().toLowerCase() !== saved.correo.toLowerCase();

  const save = () => {
    const n = nombre.trim();
    const c = correo.trim().toLowerCase();
    if (!n) return s.fail("El nombre no puede estar vacío.");
    if (n.length > 100) return s.fail("El nombre admite hasta 100 caracteres.");
    if (!EMAIL_RE.test(c)) return s.fail("Escribe un correo válido.");

    const dto: Record<string, string> = {};
    if (n !== saved.nombre) dto.nombre = n;
    if (c !== saved.correo.toLowerCase()) {
      if (!contrasena)
        return s.fail("Para cambiar el correo confirma tu contraseña actual.");
      dto.correo = c;
      dto.contrasenaActual = contrasena;
    }
    if (!Object.keys(dto).length) return s.fail("No hay cambios que guardar.");

    void s.run(
      async () => {
        const updated = (await usersApi.update(userId, dto)) as AccountInfo;
        const next = { nombre: updated.nombre, correo: updated.correo };
        setSaved(next);
        onSaved(next);
        setNombre(next.nombre);
        setCorreo(next.correo);
        setContrasena("");
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
      {correoCambia ? (
        <PasswordInput
          label="Contraseña actual (para confirmar el cambio de correo)"
          value={contrasena}
          onChangeText={setContrasena}
          autoComplete="current-password"
        />
      ) : null}
      <Feedback error={s.error} ok={s.ok} />
      <Button title="Guardar cuenta" loading={s.busy} onPress={save} />
    </Card>
  );
}
