import { ReactNode } from "react";
import { Text, View } from "react-native";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
export function SimpleList<T>({
  items,
  keyOf,
  renderTitle,
  renderSubtitle,
  action,
}: {
  items: T[];
  keyOf: (x: T) => string | number;
  renderTitle: (x: T) => string;
  renderSubtitle: (x: T) => string;
  action?: (x: T) => ReactNode;
}) {
  if (!items.length)
    return <EmptyState message="No hay elementos para mostrar." />;
  return (
    <View className="gap-3">
      {items.map((x) => (
        <Card key={keyOf(x)} className="gap-1">
          <Text className="font-sans font-semibold text-ink">
            {renderTitle(x)}
          </Text>
          <Text className="font-sans text-sm text-muted">
            {renderSubtitle(x)}
          </Text>
          {action?.(x)}
        </Card>
      ))}
    </View>
  );
}
