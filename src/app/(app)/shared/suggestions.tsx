import { useState } from "react";
import { Alert, View } from "react-native";
import { suggestionsApi } from "@/api/suggestions";
import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { H1, Muted } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function Suggestions() {
  const [comentario, setComentario] = useState("");
  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[650px] gap-4">
          <H1>Buzón de sugerencias</H1>
          <Muted>Comparte comentarios generales sin información clínica.</Muted>
          <Input
            label="Comentario"
            multiline
            numberOfLines={6}
            value={comentario}
            onChangeText={setComentario}
          />
          <Button
            title="Enviar sugerencia"
            onPress={async () => {
              try {
                await suggestionsApi.create({
                  anonima: false,
                  categoria: 5,
                  comentario,
                });
                setComentario("");
                Alert.alert("Gracias", "Sugerencia registrada");
              } catch {
                Alert.alert("Error", "No fue posible enviarla");
              }
            }}
          />
        </View>
      </Screen>
    </>
  );
}
