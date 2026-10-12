import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
export function AppHeader({ title = "NeuroFocus" }: { title?: string }) {
  const { signOut } = useAuth();
  return (
    <View className="border-b border-border bg-surface px-4 py-3 md:px-8">
      <View className="mx-auto w-full max-w-[1100px] flex-row items-center justify-between">
        <Text className="font-serif text-xl font-semibold text-primary">
          {title}
        </Text>
        <Pressable
          onPress={() => void signOut()}
          className="rounded-nf-sm border border-border px-3 py-2"
        >
          <Text className="font-sans text-sm text-muted">Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}
