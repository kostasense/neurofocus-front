import { Screen } from "@/components/layout/screen";
import { Muted } from "@/components/ui/typography";
import { Image } from "expo-image";
import { PropsWithChildren } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    useWindowDimensions,
    View,
} from "react-native";

const LOGO = require("../../../assets/neurofocus/neurofocus_logo.png");
const RATIO = 264 / 1080; // alto / ancho del logo
const DESKTOP_MIN_WIDTH = 768;

function Logo({ width }: { width: number }) {
  return (
    <Image
      source={LOGO}
      contentFit="contain"
      accessibilityLabel="NeuroFocus"
      style={{ width, height: Math.round(width * RATIO) }}
    />
  );
}

/**
 * Escritorio: logo a la izquierda sobre fondo crema y la tarjeta a la derecha
 * sobre fondo verde. Móvil: logo arriba de la tarjeta, como antes.
 */
export function AuthShell({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();

  if (width >= DESKTOP_MIN_WIDTH)
    return (
      <View className="flex-1 flex-row">
        <View className="flex-1 items-center justify-center bg-background px-10">
          <Logo width={Math.min(460, Math.round(width / 2 - 80))} />
          <Muted className="mt-6 max-w-[360px] text-center text-base">
            Tu espacio de apoyo emocional.
          </Muted>
        </View>
        <ScrollView
          className="flex-1 bg-primary"
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-[440px]">{children}</View>
        </ScrollView>
      </View>
    );

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center"
      >
        <View className="mx-auto w-full max-w-[440px]">
          <View className="mb-4">
            <Logo width={190} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
