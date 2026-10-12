import { Text, TextProps } from "react-native";
import { cn } from "@/lib/cn";
export const H1 = ({ className, ...p }: TextProps & { className?: string }) => (
  <Text
    className={cn("font-serif text-3xl font-medium text-ink", className)}
    {...p}
  />
);
export const H2 = ({ className, ...p }: TextProps & { className?: string }) => (
  <Text
    className={cn("font-serif text-xl font-medium text-ink", className)}
    {...p}
  />
);
export const Body = ({
  className,
  ...p
}: TextProps & { className?: string }) => (
  <Text
    className={cn("font-sans text-[15px] leading-6 text-ink", className)}
    {...p}
  />
);
export const Muted = ({
  className,
  ...p
}: TextProps & { className?: string }) => (
  <Text className={cn("font-sans text-sm text-muted", className)} {...p} />
);
