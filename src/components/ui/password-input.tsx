import { Input } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInputProps, View } from "react-native";

/** Campo de contraseña con icono para mostrar u ocultar los caracteres. */
export function PasswordInput({
  label,
  error,
  style,
  ...props
}: Omit<TextInputProps, "secureTextEntry"> & {
  label?: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="gap-1.5">
      <View className="relative">
        <Input
          label={label}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={[{ paddingRight: 48 }, style]}
          {...props}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            visible ? "Ocultar contraseña" : "Mostrar contraseña"
          }
          className="absolute bottom-0 right-0 h-11 w-12 items-center justify-center"
        >
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={22}
            color="#6b7280"
          />
        </Pressable>
      </View>
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
