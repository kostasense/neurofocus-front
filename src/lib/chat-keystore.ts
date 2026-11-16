import { fromB64, toB64 } from "@/lib/e2ee";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Guarda la clave privada de identidad SOLO en este dispositivo:
 * Keychain / Keystore en móvil, localStorage en web. Una clave por usuario.
 */
const key = (userId: number) => `neurofocus.chat.identity.${userId}`;

export async function getLocalPrivateKey(userId: number) {
  try {
    const raw =
      Platform.OS === "web"
        ? typeof localStorage === "undefined"
          ? null
          : localStorage.getItem(key(userId))
        : await SecureStore.getItemAsync(key(userId));
    return raw ? fromB64(raw) : null;
  } catch {
    return null;
  }
}

export async function saveLocalPrivateKey(userId: number, priv: Uint8Array) {
  const raw = toB64(priv);
  if (Platform.OS === "web") localStorage.setItem(key(userId), raw);
  else await SecureStore.setItemAsync(key(userId), raw);
}

export async function clearLocalPrivateKey(userId: number) {
  try {
    if (Platform.OS === "web") localStorage.removeItem(key(userId));
    else await SecureStore.deleteItemAsync(key(userId));
  } catch {
    /* nada que borrar */
  }
}
