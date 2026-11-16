import { ChatIdentityGate } from "@/components/chat/identity-gate";
import { ChatWorkspace } from "@/components/chat/workspace";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

export default function Chat() {
  const { user } = useAuth();
  const { canal } = useLocalSearchParams<{ canal?: string }>();
  return (
    <>
      <AppHeader />
      <Screen scroll={false}>
        <View className="mb-4 gap-1">
          <H1>Chat privado</H1>
          <Muted>
            Cifrado de extremo a extremo: solo tú y tu psicólogo pueden leer
            estos mensajes.
          </Muted>
        </View>
        <ChatIdentityGate userId={user!.userId}>
          {(me) => <ChatWorkspace me={me} role={1} initialCanal={canal} />}
        </ChatIdentityGate>
      </Screen>
    </>
  );
}
