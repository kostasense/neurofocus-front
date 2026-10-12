import { View, ViewProps } from "react-native";
import { cn } from "@/lib/cn";
export function Card({ className, ...p }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn(
        "rounded-nf border border-border bg-surface p-5",
        className,
      )}
      {...p}
    />
  );
}
