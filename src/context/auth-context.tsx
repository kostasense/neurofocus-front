import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { router } from "expo-router";
import { authApi } from "@/api/auth";
import { clearTokens, getTokens, saveTokens } from "@/lib/token-storage";
import { setAuthFailureHandler } from "@/lib/api-client";
import type { AuthUser } from "@/types/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (correo: string, contrasena: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const signOut = async () => {
    await clearTokens();
    setUser(null);
    router.replace("/(auth)/login");
  };
  useEffect(() => {
    setAuthFailureHandler(() => {
      void signOut();
    });
    (async () => {
      const t = await getTokens();
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        const r: any = await authApi.profile();
        setUser({
          userId: r.data?.id ?? r.id,
          correo: r.data?.correo ?? r.correo,
          rol: r.data?.rol ?? r.rol,
        });
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const signIn = async (correo: string, contrasena: string) => {
    const r: any = await authApi.login(correo, contrasena);
    const p = r.data ?? r;
    if (!p.accessToken)
      throw new Error(r.message ?? "No fue posible iniciar sesión");
    await saveTokens({
      accessToken: p.accessToken,
      refreshToken: p.refreshToken,
    });
    const profile: any = await authApi.profile();
    const d = profile.data ?? profile;
    const u = { userId: d.id, correo: d.correo, rol: d.rol } as AuthUser;
    setUser(u);
    router.replace(
      u.rol === 1
        ? "/(app)/patient"
        : u.rol === 2
          ? "/(app)/psychologist"
          : "/(app)/admin",
    );
  };
  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth requiere AuthProvider");
  return v;
}
