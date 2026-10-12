import { useAuth } from "@/context/auth-context";
import { roleHome } from "@/lib/format";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Href, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

// assets/neurofocus/neurofocus_logo.png (relativo a la raíz del proyecto)
const LOGO = require("../../../assets/neurofocus/neurofocus_logo.png");
// Caja que ocupa el logo; el logo se ajusta dentro sin deformarse.
// Si se ve muy chico o grande, cambia solo estas dos constantes.
const LOGO_HEIGHT = 50;
const LOGO_WIDTH = 150;

const POPOVER_WIDTH = 220;
const DESKTOP_MIN_WIDTH = 768;

type Rect = { x: number; y: number; w: number; h: number };

export function AppHeader({ title = "NeuroFocus" }: { title?: string }) {
  const { user, signOut } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  // Web con pantalla ancha = ventana flotante. Móvil (o web angosto) = cajón.
  const isDesktop = Platform.OS === "web" && windowWidth >= DESKTOP_MIN_WIDTH;

  const buttonRef = useRef<View>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const [open, setOpen] = useState(false); // intención: abierto o cerrado
  const [mounted, setMounted] = useState(false); // mantiene el modal para animar la salida
  const [button, setButton] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  // Borde inferior del header, tomado de su propio layout (no de measureInWindow).
  const [headerBottom, setHeaderBottom] = useState(0);
  const [drawerHeight, setDrawerHeight] = useState(200);

  const openMenu = () => {
    if (isDesktop) {
      // Solo la ventana flotante (web) necesita saber dónde está el botón.
      buttonRef.current?.measureInWindow((x, y, w, h) => {
        setButton({ x, y, w, h });
        setMounted(true);
        setOpen(true);
      });
    } else {
      setMounted(true);
      setOpen(true);
    }
  };
  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!mounted) return;
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: open ? 220 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, mounted, anim]);

  const goHome = () => {
    if (user) router.navigate(roleHome(user.rol) as Href);
  };

  const logout = () => {
    closeMenu();
    void signOut();
  };

  const menuItems = (
    <Pressable
      accessibilityRole="button"
      onPress={logout}
      className="min-h-11 flex-row items-center gap-3 rounded-nf-sm px-3 py-2.5 hover:bg-background active:bg-background"
    >
      <Feather name="log-out" size={18} color="#B83232" />
      <Text className="font-sans text-[15px] font-medium text-danger">
        Cerrar sesión
      </Text>
    </Pressable>
  );

  // --- Ventana flotante (web) ---
  const popoverLeft = Math.max(
    8,
    Math.min(
      button.x + button.w - POPOVER_WIDTH,
      windowWidth - POPOVER_WIDTH - 8,
    ),
  );
  const popover = (
    <>
      {/* Fondo transparente: un clic fuera cierra la ventana */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeMenu}
        accessibilityLabel="Cerrar menú"
      />
      <Animated.View
        style={{
          position: "absolute",
          top: button.y + button.h + 8,
          left: popoverLeft,
          width: POPOVER_WIDTH,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-6, 0],
              }),
            },
          ],
          shadowColor: "#1C1C2A",
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <View className="rounded-nf border border-border bg-surface p-2">
          {menuItems}
        </View>
      </Animated.View>
    </>
  );

  // --- Cajón que baja desde el borde inferior del header (móvil) ---
  const drawer = (
    <>
      {/* Zona del header: tocarla cierra el menú (el modal tapa el header) */}
      <Pressable
        onPress={closeMenu}
        accessibilityLabel="Cerrar menú"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: headerBottom,
        }}
      />
      {/* Oscurece el contenido que queda debajo */}
      <Animated.View
        style={{
          position: "absolute",
          top: headerBottom,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(28,28,42,0.4)",
          opacity: anim,
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={closeMenu}
          accessibilityLabel="Cerrar menú"
        />
      </Animated.View>
      {/* Panel: sale desde debajo del header, por encima del contenido */}
      <View
        style={{
          position: "absolute",
          top: headerBottom,
          left: 0,
          right: 0,
          overflow: "hidden",
        }}
      >
        <Animated.View
          onLayout={(e) => setDrawerHeight(e.nativeEvent.layout.height)}
          style={{
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-drawerHeight, 0],
                }),
              },
            ],
          }}
        >
          <View className="border-b border-border bg-surface px-4 pb-4 pt-3">
            {menuItems}
          </View>
        </Animated.View>
      </View>
    </>
  );

  return (
    <View
      onLayout={(e) =>
        setHeaderBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)
      }
      className="border-b border-border bg-surface px-4 py-3 md:px-8"
    >
      <View className="mx-auto w-full max-w-[1100px] flex-row items-center justify-between">
        <Pressable
          onPress={goHome}
          accessibilityRole="link"
          accessibilityLabel={`${title}, ir al inicio`}
          className="active:opacity-80"
        >
          <Image
            source={LOGO}
            style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT }}
            contentFit="contain"
            contentPosition="left"
            accessibilityLabel={title}
          />
        </Pressable>

        <Pressable
          ref={buttonRef}
          collapsable={false}
          onPress={open ? closeMenu : openMenu}
          accessibilityRole="button"
          accessibilityLabel={open ? "Cerrar menú" : "Abrir menú"}
          accessibilityState={{ expanded: open }}
          className="h-11 w-11 items-center justify-center rounded-nf-sm border border-border active:opacity-80"
        >
          <Feather name={open ? "x" : "menu"} size={22} color="#1C1C2A" />
        </Pressable>
      </View>

      <Modal
        transparent
        visible={mounted}
        animationType="none"
        onRequestClose={closeMenu}
      >
        {isDesktop ? popover : drawer}
      </Modal>
    </View>
  );
}
