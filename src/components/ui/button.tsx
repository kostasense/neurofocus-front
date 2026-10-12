import {
  Pressable,
  Text,
  ActivityIndicator,
  PressableProps,
} from "react-native";
import { cn } from "@/lib/cn";
export function Button({
  title,
  variant = "primary",
  loading,
  className,
  ...props
}: PressableProps & {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  loading?: boolean;
  className?: string;
}) {
  const bg = {
    primary: "bg-primary",
    secondary: "bg-background border border-border",
    danger: "bg-danger",
    success: "bg-success",
  }[variant];
  const tx = variant === "secondary" ? "text-ink" : "text-white";
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        "min-h-11 items-center justify-center rounded-nf-sm px-5 py-2.5 active:opacity-80",
        bg,
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" ? "#1C1C2A" : "white"}
        />
      ) : (
        <Text className={cn("font-sans text-sm font-semibold", tx)}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
