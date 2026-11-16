import { chatApi, MyIdentity } from "@/api/chat";
import { Loading } from "@/components/feedback/loading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { H2, Muted } from "@/components/ui/typography";
import type { Me } from "@/lib/chat-keys";
import {
    clearLocalPrivateKey,
    getLocalPrivateKey,
    saveLocalPrivateKey,
} from "@/lib/chat-keystore";
import { confirmAsync } from "@/lib/confirm";
import {
    fromB64,
    newIdentity,
    publicFrom,
    toB64,
    unwrapPrivateKey,
    wrapPrivateKey,
} from "@/lib/e2ee";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

const MIN_PASS = 10;

type State =
  | { s: "loading" }
  | { s: "error"; msg: string }
  | { s: "new" }
  | { s: "restore"; server: MyIdentity }
  | { s: "ready"; me: Me };

const eq = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

const errText = (e: any) =>
  e?.response?.data?.message ?? e?.message ?? "Ocurrió un error";

/**
 * Deja listo el cifrado del usuario antes de mostrar el chat:
 *  - primera vez  → crea el par de claves, publica la pública y un respaldo cifrado con una frase;
 *  - otro equipo  → pide la frase para recuperar la privada desde el respaldo;
 *  - ya activado  → entrega la identidad al chat.
 */
export function ChatIdentityGate({
  userId,
  children,
}: {
  userId: number;
  children: (me: Me) => ReactNode;
}) {
  const [st, setSt] = useState<State>({ s: "loading" });

  const load = useCallback(async () => {
    setSt({ s: "loading" });
    try {
      const [local, server] = await Promise.all([
        getLocalPrivateKey(userId),
        chatApi.myIdentity(),
      ]);
      if (!server) return setSt({ s: "new" });
      const serverPub = fromB64(server.clavePublica);
      if (local && eq(publicFrom(local), serverPub))
        return setSt({
          s: "ready",
          me: { id: userId, priv: local, pub: serverPub },
        });
      setSt({ s: "restore", server });
    } catch (e) {
      setSt({ s: "error", msg: errText(e) });
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (st.s === "loading") return <Loading />;
  if (st.s === "ready") return <>{children(st.me)}</>;

  // Estas tarjetas pueden ser más altas que la pantalla (el Screen del chat no scrollea).
  const scrolled = (node: ReactNode) => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {node}
    </ScrollView>
  );

  if (st.s === "error")
    return scrolled(
      <Card className="gap-3">
        <Text className="font-sans text-sm text-danger">{st.msg}</Text>
        <Button
          title="Reintentar"
          onPress={() => void load()}
          className="self-start"
        />
      </Card>,
    );
  if (st.s === "new")
    return scrolled(
      <SetupCard userId={userId} onDone={(me) => setSt({ s: "ready", me })} />,
    );
  return scrolled(
    <RestoreCard
      userId={userId}
      server={st.server}
      onDone={(me) => setSt({ s: "ready", me })}
      onReset={() => setSt({ s: "new" })}
    />,
  );
}

/* ---------------- primera vez / restablecer ---------------- */
function SetupCard({
  userId,
  onDone,
}: {
  userId: number;
  onDone: (me: Me) => void;
}) {
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = async () => {
    setError("");
    if (pass.length < MIN_PASS)
      return setError(`La frase debe tener al menos ${MIN_PASS} caracteres.`);
    if (pass !== again) return setError("Las frases no coinciden.");
    setBusy(true);
    try {
      const id = newIdentity();
      const respaldo = await wrapPrivateKey(id.priv, pass, userId);
      await chatApi.saveIdentity({
        clavePublica: toB64(id.pub),
        respaldoClavePrivada: respaldo,
      });
      await saveLocalPrivateKey(userId, id.priv);
      onDone({ id: userId, priv: id.priv, pub: id.pub });
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-[520px] gap-4">
      <H2>Activa tu chat privado</H2>
      <Muted>
        Tus mensajes se cifran en este dispositivo y solo tú y tu pareja de chat
        pueden leerlos; ni el servidor ni la base de datos ven su contenido.
        Elige una frase para proteger tu clave: te servirá para recuperar tus
        conversaciones en otro dispositivo.
      </Muted>
      <View className="rounded-nf-sm border border-border bg-background p-3">
        <Text className="font-sans text-sm text-ink">
          Guárdala bien: no podemos recuperarla. Si la olvidas, tendrás que
          crear una clave nueva y perderás el acceso a los mensajes anteriores.
        </Text>
      </View>
      <PasswordInput
        label="Frase de cifrado"
        value={pass}
        onChangeText={setPass}
      />
      <PasswordInput
        label="Repite la frase"
        value={again}
        onChangeText={setAgain}
        error={error || undefined}
      />
      {busy ? (
        <Muted>Protegiendo tu clave… puede tardar unos segundos.</Muted>
      ) : null}
      <Button
        title="Activar cifrado"
        loading={busy}
        onPress={() => void go()}
      />
    </Card>
  );
}

/* ---------------- otro dispositivo ---------------- */
function RestoreCard({
  userId,
  server,
  onDone,
  onReset,
}: {
  userId: number;
  server: MyIdentity;
  onDone: (me: Me) => void;
  onReset: () => void;
}) {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = async () => {
    setError("");
    if (!pass) return setError("Escribe tu frase de cifrado.");
    setBusy(true);
    try {
      const priv = await unwrapPrivateKey(
        server.respaldoClavePrivada,
        pass,
        userId,
      );
      const pub = publicFrom(priv);
      if (!eq(pub, fromB64(server.clavePublica)))
        throw new Error("El respaldo no corresponde a tu clave actual.");
      await saveLocalPrivateKey(userId, priv);
      onDone({ id: userId, priv, pub });
    } catch (e: any) {
      setError(e?.message ?? "No se pudo recuperar la clave");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const ok = await confirmAsync(
      "Crear una clave nueva",
      "Perderás el acceso a los mensajes que se cifraron con tu clave anterior. La otra persona seguirá viéndolos. ¿Continuar?",
      "Crear clave nueva",
      "Volver",
    );
    if (!ok) return;
    await clearLocalPrivateKey(userId);
    onReset();
  };

  return (
    <Card className="mx-auto w-full max-w-[520px] gap-4">
      <H2>Recupera tu chat en este dispositivo</H2>
      <Muted>
        Tu cifrado ya está activo en otro dispositivo. Escribe tu frase de
        cifrado para recuperar tu clave aquí.
      </Muted>
      <PasswordInput
        label="Frase de cifrado"
        value={pass}
        onChangeText={setPass}
        error={error || undefined}
      />
      {busy ? (
        <Muted>Recuperando tu clave… puede tardar unos segundos.</Muted>
      ) : null}
      <Button title="Recuperar" loading={busy} onPress={() => void go()} />
      <Button
        title="Olvidé mi frase"
        variant="secondary"
        onPress={() => void reset()}
      />
    </Card>
  );
}
