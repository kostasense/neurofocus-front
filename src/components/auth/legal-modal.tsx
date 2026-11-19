import { Button } from "@/components/ui/button";
import type { LegalDoc } from "@/lib/legal";
import { LEGAL_VERSION } from "@/lib/legal";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

/** Muestra un texto legal a pantalla casi completa, con scroll y botón de cierre. */
export function LegalModal({
  doc,
  onClose,
}: {
  doc: LegalDoc | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={doc != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Cerrar"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/50 p-4"
      >
        {/* Pressable interno: evita cerrar al tocar dentro de la tarjeta. */}
        <Pressable
          onPress={() => {}}
          className="max-h-[85%] w-full max-w-2xl rounded-nf bg-surface p-5"
        >
          <Text className="font-serif text-2xl text-ink">{doc?.titulo}</Text>
          <Text className="mb-3 font-sans text-xs text-muted">
            Versión {LEGAL_VERSION}
          </Text>
          <ScrollView className="mb-4" showsVerticalScrollIndicator>
            <View className="gap-4 pr-1">
              {doc?.secciones.map((s) => (
                <View key={s.titulo} className="gap-1.5">
                  <Text className="font-sans text-base font-semibold text-ink">
                    {s.titulo}
                  </Text>
                  {s.parrafos.map((p, i) => (
                    <Text
                      key={i}
                      className="font-sans text-sm leading-5 text-ink"
                    >
                      {p}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          <Button title="Cerrar" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
