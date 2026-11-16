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
            Cifrado de extremo a extremo: los mensajes se cifran y descifran en
            este dispositivo.
          </Muted>
        </View>
        <ChatIdentityGate userId={user!.userId}>
          {(me) => <ChatWorkspace me={me} role={2} initialCanal={canal} />}
        </ChatIdentityGate>
      </Screen>
    </>
  );
}
