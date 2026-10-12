import { Text, View } from "react-native";
export const EmptyState = ({ message }: { message: string }) => (
  <View className="items-center rounded-nf border border-dashed border-border p-10">
    <Text className="font-sans text-sm text-muted">{message}</Text>
  </View>
);
