import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Login() {
  const { signIn } = useAuth();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const contrasenaRef = useRef<TextInput>(null);

  const submit = async () => {
    if (loading) return;
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
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center"
      >
        <View className="mx-auto w-full max-w-[440px]">
          <Text className="mb-3 font-serif text-xl font-semibold text-primary">
            NeuroFocus
          </Text>
          <Card className="gap-5 p-6 md:p-8">
            <View>
              <H1>Bienvenido</H1>
              <Muted className="mt-1">
                Accede a tu espacio de apoyo emocional.
              </Muted>
            </View>
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
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => contrasenaRef.current?.focus()}
            />
            <View>
              <Input
                ref={contrasenaRef}
                label="Contraseña"
                value={contrasena}
                onChangeText={setContrasena}
                secureTextEntry={!mostrarContrasena}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
              />
              <Pressable
                onPress={() => setMostrarContrasena((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  mostrarContrasena
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                className="absolute bottom-0 right-0 h-12 w-12 items-center justify-center"
              >
                <Ionicons
                  name={mostrarContrasena ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#6b7280"
                />
              </Pressable>
            </View>
            <Button
              title="Iniciar sesión"
              loading={loading}
              onPress={() => void submit()}
            />
            <Link
              href="/(auth)/register"
              className="text-center font-sans text-sm text-primary"
            >
              Crear cuenta de paciente
            </Link>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
