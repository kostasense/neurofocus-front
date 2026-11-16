import { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

/**
 * `topInset`: respeta también la barra de estado. Solo hace falta en pantallas
 * sin AppHeader (el AppHeader ya aplica el margen superior por su cuenta).
 */
export function Screen({
  children,
  scroll = true,
  topInset = false,
}: PropsWithChildren<{ scroll?: boolean; topInset?: boolean }>) {
  const edges: Edge[] = topInset
    ? ["top", "left", "right", "bottom"]
    : ["left", "right", "bottom"];
  const content = (
    <View className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 md:px-8 md:py-10">
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
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
