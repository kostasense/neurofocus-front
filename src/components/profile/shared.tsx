import { useState } from "react";
import { Text, View } from "react-native";

export const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Estado de guardado independiente por sección. */
export function useSaver() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const fail = (m: string) => {
    setOk("");
    setError(m);
  };
  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    setError("");
    setOk("");
    try {
      await fn();
      setOk(okMsg);
    } catch (e) {
      setError(errMsg(e, "No fue posible guardar los cambios"));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, ok, fail, run };
}

export function Feedback({ error, ok }: { error: string; ok: string }) {
  if (error)
    return <Text className="font-sans text-sm text-danger">{error}</Text>;
  if (ok) return <Text className="font-sans text-sm text-success">{ok}</Text>;
  return null;
}

export function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="gap-1">
      <Text className="font-sans text-sm font-medium text-ink">{label}</Text>
      <View className="min-h-11 justify-center rounded-nf-sm border border-border bg-border/30 px-3.5">
        <Text className="font-sans text-[15px] text-muted">{value}</Text>
      </View>
    </View>
  );
}
