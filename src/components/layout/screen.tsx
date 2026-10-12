import { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export function Screen({
  children,
  scroll = true,
}: PropsWithChildren<{ scroll?: boolean }>) {
  const content = (
    <View className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 md:px-8 md:py-10">
      {children}
    </View>
  );
  return (
    <SafeAreaView className="flex-1 bg-background">
      {scroll ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
