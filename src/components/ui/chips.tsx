import { cn } from "@/lib/cn";
import { Pressable, Text, View } from "react-native";

export function Chips<T extends string | number | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            className={cn(
              "rounded-nf-sm border px-3 py-2",
              on ? "border-primary bg-primary" : "border-border bg-surface",
            )}
          >
            <Text
              className={cn(
                "font-sans text-sm",
                on ? "font-semibold text-white" : "text-ink",
              )}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
