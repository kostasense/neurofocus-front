import { Ref } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

export function Input({
  label,
  error,
  ref,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string;
  ref?: Ref<TextInput>;
}) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="font-sans text-sm font-medium text-ink">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#6B6B7C"
        className="min-h-11 rounded-nf-sm border border-border bg-surface px-3.5 font-sans text-[15px] text-ink"
        {...props}
      />
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
