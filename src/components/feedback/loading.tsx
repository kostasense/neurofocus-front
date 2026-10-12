import { ActivityIndicator, View } from "react-native";
export const Loading = () => (
  <View className="flex-1 items-center justify-center bg-background">
    <ActivityIndicator size="large" color="#3B7A70" />
  </View>
);
