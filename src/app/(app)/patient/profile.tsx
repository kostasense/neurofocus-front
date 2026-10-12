import { patientsApi } from "@/api/patients";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useState } from "react";
import { Alert, View } from "react-native";
export default function Profile() {
  const { user } = useAuth();
  const [telefono, setTelefono] = useState("");
  const [telefonoConfianza, setTelefonoConfianza] = useState("");
  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[600px] gap-4">
          <H1>Mi perfil</H1>
          <Muted>Los teléfonos se cifran y solo son visibles para tí.</Muted>
          <Input label="Teléfono" value={telefono} onChangeText={setTelefono} />
          <Input
            label="Teléfono de contacto de confianza"
            value={telefonoConfianza}
            onChangeText={setTelefonoConfianza}
          />
          <Button
            title="Guardar cambios"
            onPress={async () => {
              try {
                await patientsApi.update(user!.userId, {
                  telefono,
                  telefonoConfianza,
                });
                Alert.alert("Guardado");
              } catch {
                Alert.alert("Error", "No fue posible guardar");
              }
            }}
          />
        </View>
      </Screen>
    </>
  );
}
