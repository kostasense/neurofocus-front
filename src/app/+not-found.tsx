import { useAuth } from "@/context/auth-context";
import { roleHome } from "@/lib/format";
import { Href, Redirect } from "expo-router";

/**
 * Se muestra cuando la URL no existe o es de otro rol (ruta protegida).
 * En lugar de una pantalla de error, regresa al inicio del usuario.
 */
export default function NotFound() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href={roleHome(user.rol) as Href} />;
}
