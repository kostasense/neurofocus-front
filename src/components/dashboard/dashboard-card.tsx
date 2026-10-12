import { Pressable, Text, View } from "react-native";
import { router, Href } from "expo-router";
import { LucideIcon } from "lucide-react-native";
export function DashboardCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: Href;
  icon: LucideIcon;
}) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      className="w-full rounded-nf border border-border bg-surface p-5 active:border-primary md:basis-[31%]"
    >
      <View className="mb-4 h-10 w-10 items-center justify-center rounded-full bg-primary-light">
        <Icon size={20} color="#3B7A70" />
      </View>
      <Text className="font-sans text-base font-semibold text-ink">
        {title}
      </Text>
      <Text className="mt-1 font-sans text-sm leading-5 text-muted">
        {description}
      </Text>
    </Pressable>
  );
}
