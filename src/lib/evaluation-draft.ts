import type { Answers } from "@/lib/instruments";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Borrador local de una evaluación en curso (guardado parcial).
 * El backend solo escribe las respuestas al enviar cada instrumento, así que el
 * borrador vive en este dispositivo: SecureStore en móvil y localStorage en web.
 * Se guarda un solo borrador por usuario (solo puede haber una evaluación abierta).
 */
export type EvaluationDraft = {
  evaluationId: string;
  answers: Answers;
  dificultad: number | null;
  page: number;
  savedAt: string; // ISO UTC
};

const key = (userId: number) => `neurofocus.evaluation-draft.${userId}`;

export async function loadDraft(
  userId: number,
): Promise<EvaluationDraft | null> {
  try {
    const raw =
      Platform.OS === "web"
        ? typeof localStorage === "undefined"
          ? null
          : localStorage.getItem(key(userId))
        : await SecureStore.getItemAsync(key(userId));
    return raw ? (JSON.parse(raw) as EvaluationDraft) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(userId: number, draft: EvaluationDraft) {
  const raw = JSON.stringify(draft);
  if (Platform.OS === "web") localStorage.setItem(key(userId), raw);
  else await SecureStore.setItemAsync(key(userId), raw);
}

export async function clearDraft(userId: number) {
  try {
    if (Platform.OS === "web") localStorage.removeItem(key(userId));
    else await SecureStore.deleteItemAsync(key(userId));
  } catch {
    /* sin borrador que limpiar */
  }
}
