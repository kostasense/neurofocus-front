import { Alert, Platform } from "react-native";

/** Confirmación que funciona en móvil y en web (Alert.alert no hace nada en web). */
export function confirmAsync(
  title: string,
  message: string,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(
      typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`),
    );
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: "destructive",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
