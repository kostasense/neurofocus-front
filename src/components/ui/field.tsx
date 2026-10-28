import { ReactNode } from "react";
import { Text, View } from "react-native";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans text-sm font-medium text-ink">{label}</Text>
      {children}
    </View>
  );
}
