import { chatApi } from "@/api/chat";
import { Feather } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const POLL_MS = 5000;

/**
 * Botón flotante de chat (esquina inferior derecha) con la suma de mensajes sin
 * leer de todas las conversaciones. Ponerlo como último hijo de un contenedor
 * `flex-1` para que flote sobre el contenido.
 */
export function ChatFab({ href }: { href: Href }) {
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const list = await chatApi.channels();
        const total = list.reduce((n, c) => n + (Number(c.no_leidos) || 0), 0);
        if (alive) setUnread(total);
      } catch {
        /* el indicador es informativo */
      }
    };
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: 40,
        bottom: Math.max(insets.bottom, 0) + 50,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unread > 0 ? `Abrir chat, ${unread} mensajes sin leer` : "Abrir chat"
        }
        onPress={() => router.push(href)}
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
        className="h-16 w-16 items-center justify-center rounded-2xl bg-primary active:opacity-90"
      >
        <Feather name="message-circle" size={30} color="#FFFFFF" />
      </Pressable>
      {unread > 0 ? (
        <View
          pointerEvents="none"
          className="absolute -right-1 -top-1 h-6 min-w-6 items-center justify-center rounded-full border-2 border-primary bg-white px-1"
        >
          <Text className="font-sans text-[11px] font-semibold text-black">
            {unread > 99 ? "99+" : unread}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
