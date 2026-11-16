import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

type Mode = "login" | "register";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "login", label: "Iniciar sesión" },
  { mode: "register", label: "Crear cuenta" },
];

/** Una sola tarjeta: las pestañas cambian su contenido sin mover el resto de la pantalla. */
export default function Login() {
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const [mode, setMode] = useState<Mode>(
    modo === "registro" ? "register" : "login",
  );
  const [correo, setCorreo] = useState("");
  const [notice, setNotice] = useState("");

  return (
    <AuthShell>
      <Card className="gap-5 p-6 md:p-8">
        {/*
        <View className="flex-row rounded-nf-sm bg-background p-1">
          {TABS.map((t) => {
            const on = t.mode === mode;
            return (
              <Pressable
                key={t.mode}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setMode(t.mode);
                  setNotice("");
                }}
                className={cn(
                  "min-h-10 flex-1 items-center justify-center rounded-nf-sm px-3",
                  on && "bg-surface shadow-sm",
                )}
              >
                <Text
                  className={cn(
                    "font-sans text-sm",
                    on ? "font-semibold text-primary" : "text-muted",
                  )}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        */}

        {mode === "login" ? (
          <LoginForm
            initialCorreo={correo}
            notice={notice}
            onSwitch={() => setMode("register")}
          />
        ) : (
          <RegisterForm
            onSwitch={() => setMode("login")}
            onRegistered={(c) => {
              setCorreo(c);
              setNotice("Cuenta creada. Ya puedes iniciar sesión.");
              setMode("login");
            }}
          />
        )}
      </Card>
    </AuthShell>
  );
}
