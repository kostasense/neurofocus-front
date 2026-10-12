import { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/layout/screen";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { H1, Muted } from "@/components/ui/typography";
import { usersApi } from "@/api/users";
export default function Register() {
  const [d, setD] = useState({
    correo: "",
    contrasena: "",
    nombre: "",
    numControlOEmpleado: "",
    tipoPersona: "A",
  });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    try {
      setLoading(true);
      await usersApi.register(d);
      Alert.alert("Cuenta creada", "Ya puedes iniciar sesión");
      router.replace("/(auth)/login");
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "No fue posible registrar la cuenta",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen>
      <View className="mx-auto w-full max-w-[560px]">
        <Card className="gap-4">
          <H1>Crear cuenta</H1>
          <Muted>Registro de paciente</Muted>
          <Input
            label="Nombre"
            value={d.nombre}
            onChangeText={(v) => setD({ ...d, nombre: v })}
          />
          <Input
            label="Correo"
            autoCapitalize="none"
            value={d.correo}
            onChangeText={(v) => setD({ ...d, correo: v })}
          />
          <Input
            label="Contraseña"
            secureTextEntry
            value={d.contrasena}
            onChangeText={(v) => setD({ ...d, contrasena: v })}
          />
          <Input
            label="Número de control o empleado"
            value={d.numControlOEmpleado}
            onChangeText={(v) => setD({ ...d, numControlOEmpleado: v })}
          />
          <Input
            label="Tipo (A, D o PA)"
            value={d.tipoPersona}
            onChangeText={(v) => setD({ ...d, tipoPersona: v.toUpperCase() })}
          />
          <Button
            title="Registrarme"
            loading={loading}
            onPress={() => void submit()}
          />
          <Button
            title="Volver"
            variant="secondary"
            onPress={() => router.back()}
          />
        </Card>
      </View>
    </Screen>
  );
}
