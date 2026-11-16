import { usersApi } from "@/api/users";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { H2, Muted } from "@/components/ui/typography";
import { useState } from "react";
import { Feedback, useSaver } from "./shared";

/** Cambio de contraseña de la propia cuenta. */
export function PasswordSection({ userId }: { userId: number }) {
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
