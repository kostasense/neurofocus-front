import { useAuth } from "@/context/auth-context";
import { ROLES } from "@/types/routes";
import { Stack } from "expo-router";

/**
 * Cada carpeta (patient, psychologist, admin) solo existe para su rol.
 * Si otro rol escribe esa URL, la ruta deja de existir y se muestra
 * +not-found, que lo regresa a su pantalla de inicio.
 * La carpeta "shared" no se protege: la usan todos los roles.
 */
export default function AppLayout() {
  const { user } = useAuth();
  const rol = user?.rol;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={rol === ROLES.PATIENT}>
        <Stack.Screen name="patient" />
      </Stack.Protected>
      <Stack.Protected guard={rol === ROLES.PSYCHOLOGIST}>
        <Stack.Screen name="psychologist" />
      </Stack.Protected>
      <Stack.Protected guard={rol === ROLES.ADMIN}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}
