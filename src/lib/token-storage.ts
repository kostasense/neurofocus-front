import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthTokens } from "@/types/api";
const KEY = "neurofocus.tokens";
const webStore = {
  get: () =>
    typeof localStorage === "undefined" ? null : localStorage.getItem(KEY),
  set: (v: string) => localStorage.setItem(KEY, v),
  clear: () => localStorage.removeItem(KEY),
};
export async function getTokens(): Promise<AuthTokens | null> {
  try {
    const raw =
      Platform.OS === "web"
        ? webStore.get()
        : await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export async function saveTokens(tokens: AuthTokens) {
  const raw = JSON.stringify(tokens);
  if (Platform.OS === "web") webStore.set(raw);
  else await SecureStore.setItemAsync(KEY, raw);
}
export async function clearTokens() {
  if (Platform.OS === "web") webStore.clear();
  else await SecureStore.deleteItemAsync(KEY);
}
