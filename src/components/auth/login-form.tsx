import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useState } from "react";
import { Text, View } from "react-native";

export function LoginForm({
  initialCorreo = "",
  notice,
  onSwitch,
}: {
  initialCorreo?: string;
  notice?: string;
  onSwitch: () => void;
}) {
  const { signIn } = useAuth();
  const [correo, setCorreo] = useState(initialCorreo);
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn(correo.trim(), contrasena);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
          e.message ??
          "No fue posible iniciar sesión",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="gap-5">
      <View>
        <H1>Bienvenido</H1>
        <Muted className="mt-1">Accede a tu espacio de apoyo emocional.</Muted>
      </View>
      {notice ? (
        <Text className="rounded-nf-sm bg-primary-light p-3 text-sm text-primary-dark">
          {notice}
        </Text>
      ) : null}
      {error ? (
        <Text className="rounded-nf-sm bg-red-50 p-3 text-sm text-danger">
          {error}
        </Text>
      ) : null}
      <Input
        label="Correo"
        value={correo}
        onChangeText={setCorreo}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <PasswordInput
        label="Contraseña"
        value={contrasena}
        onChangeText={setContrasena}
        onSubmitEditing={() => void submit()}
      />
      <Button
        title="Iniciar sesión"
        loading={loading}
        onPress={() => void submit()}
      />
      <Text
        onPress={onSwitch}
        accessibilityRole="link"
        className="text-center font-sans text-sm text-primary"
      >
        ¿No tienes cuenta? Crear cuenta de paciente
      </Text>
    </View>
  );
}
