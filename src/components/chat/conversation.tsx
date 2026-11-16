import { chatApi } from "@/api/chat";
import { Button } from "@/components/ui/button";
import { H2, Muted } from "@/components/ui/typography";
import {
    ChannelKeys,
    loadChannelKeys,
    Me,
    renewChannelKey,
} from "@/lib/chat-keys";
import { cn } from "@/lib/cn";
import { confirmAsync } from "@/lib/confirm";
import { decryptText, encryptText, fromB64, securityCode } from "@/lib/e2ee";
import type { ChatChannel, ChatMessage } from "@/types/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

const POLL_MS = 5000;
const PAGE = 50;
const MAX_CHARS = 2000;
const PANIC_TEXT = "🚨 Alerta de pánico: necesito ayuda ahora.";

const errText = (e: any) =>
  e?.response?.data?.message ?? e?.message ?? "Ocurrió un error";
const num = (id: string | number) => Number(id);
const day = (iso: string) => new Date(iso).toDateString();
const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "full" }).format(new Date(iso));

type Row =
  | { k: "day"; id: string; label: string }
  | { k: "msg"; id: string; m: ChatMessage; text: string | null };

function Pill({ text, tone }: { text: string; tone: "ok" | "warn" | "off" }) {
  return (
    <View
      className={cn(
        "rounded-full border px-2.5 py-0.5",
        tone === "ok" && "border-success bg-surface",
        tone === "warn" && "border-warning bg-surface",
        tone === "off" && "border-border bg-background",
      )}
    >
      <Text className="font-sans text-xs text-ink">{text}</Text>
    </View>
  );
}

export function Conversation({
  channel: initial,
  me,
  role,
  title,
  onBack,
  onChanged,
}: {
  channel: ChatChannel;
  me: Me;
  role: 1 | 2;
  title: string;
  onBack?: () => void;
  onChanged?: () => void;
}) {
  const canalId = initial.id_canal;
  const [channel, setChannel] = useState<ChatChannel>(initial);
  const [keys, setKeys] = useState<ChannelKeys | null>(null);
  const [keyError, setKeyError] = useState("");
  const [peerPub, setPeerPub] = useState<Uint8Array | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const polling = useRef(false);
  const marked = useRef<Set<string>>(new Set());

  /* ------------------------------ carga ------------------------------ */
  const refreshKeys = useCallback(
    async (ch: ChatChannel) => {
      try {
        const k = await loadChannelKeys(ch, me);
        setKeys(k);
        setKeyError("");
      } catch (e) {
        setKeyError(errText(e));
      }
      try {
        const p = await chatApi.peerIdentity(canalId);
        setPeerPub(fromB64(p.clavePublica));
      } catch {
        setPeerPub(null);
      }
    },
    [me, canalId],
  );

  const refreshMessages = useCallback(async () => {
    const latest = await chatApi.messages(canalId, undefined, PAGE);
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.idMensaje, m]));
      for (const m of latest) map.set(m.idMensaje, m);
      return [...map.values()].sort(
        (a, b) => num(a.idMensaje) - num(b.idMensaje),
      );
    });
    return latest.length;
  }, [canalId]);

  // Carga inicial.
  useEffect(() => {
    let alive = true;
    setChannel(initial);
    setKeys(null);
    setKeyError("");
    setMessages([]);
    setLoaded(false);
    marked.current = new Set();
    (async () => {
      try {
        const fresh = await chatApi.channel(canalId);
        const merged = { ...initial, ...fresh };
        if (alive) setChannel(merged);
        await refreshKeys(merged);
        const n = await refreshMessages();
        if (alive) setHasMore(n >= PAGE);
      } catch (e) {
        if (alive) setNotice(errText(e));
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canalId]);

  // Sondeo: el backend no tiene tiempo real.
  useEffect(() => {
    const t = setInterval(async () => {
      if (polling.current || !loaded) return;
      polling.current = true;
      try {
        const fresh = await chatApi.channel(canalId);
        const merged = { ...channel, ...fresh };
        setChannel(merged);
        const needKeys =
          !keys || keys.usable === null || keys.incomplete.length > 0;
        if (needKeys) await refreshKeys(merged);
        await refreshMessages();
      } catch {
        /* se reintenta en el siguiente ciclo */
      } finally {
        polling.current = false;
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [canalId, loaded, channel, keys, refreshKeys, refreshMessages]);

  const loadOlder = async () => {
    if (!messages.length) return;
    try {
      const older = await chatApi.messages(
        canalId,
        messages[0].idMensaje,
        PAGE,
      );
      setHasMore(older.length >= PAGE);
      setMessages((prev) => {
        const map = new Map([...older, ...prev].map((m) => [m.idMensaje, m]));
        return [...map.values()].sort(
          (a, b) => num(a.idMensaje) - num(b.idMensaje),
        );
      });
    } catch (e) {
      setNotice(errText(e));
    }
  };

  /* --------------------------- descifrado --------------------------- */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let last = "";
    for (const m of messages) {
      const d = day(m.fechaEnvio);
      if (d !== last) {
        out.push({ k: "day", id: `d-${d}`, label: dayLabel(m.fechaEnvio) });
        last = d;
      }
      const K = keys?.keys.get(m.versionClave);
      const text = K
        ? decryptText(K, m, {
            canal: String(m.idCanal),
            emisor: m.idEmisor,
            version: m.versionClave,
            tipo: m.tipoMensaje,
          })
        : null;
      out.push({ k: "msg", id: m.idMensaje, m, text });
    }
    return out;
  }, [messages, keys]);

  // Marca como leídos los mensajes entrantes ya visibles.
  useEffect(() => {
    if (!loaded) return;
    const pending = messages.filter(
      (m) =>
        m.idEmisor !== me.id && !m.leido && !marked.current.has(m.idMensaje),
    );
    if (!pending.length) return;
    pending.forEach((m) => marked.current.add(m.idMensaje));
    void Promise.all(
      pending.map((m) => chatApi.read(m.idMensaje).catch(() => null)),
    ).then(() => {
      const now = new Date().toISOString();
      const ids = new Set(pending.map((m) => m.idMensaje));
      setMessages((prev) =>
        prev.map((m) =>
          ids.has(m.idMensaje) ? { ...m, leido: now, entregado: now } : m,
        ),
      );
    });
  }, [messages, loaded, me.id]);

  /* ------------------------------ acciones ------------------------------ */
  const blocked = useMemo(() => {
    if (!channel.abierto) return "Este chat está cerrado.";
    if (!channel.habilitado_por_psicologo)
      return role === 2
        ? "La conversación está deshabilitada. Habilítala para poder escribir."
        : "Tu psicólogo aún no habilita el chat contigo.";
    if (channel.chat_disponible === false)
      return role === 2
        ? "Tu chat está marcado como no disponible en tu perfil."
        : "El chat de tu psicólogo no está disponible por ahora.";
    if (keyError) return keyError;
    if (!keys) return "Preparando el cifrado…";
    if (keys.usable === null)
      return keys.unreadable.length
        ? "Tu clave de cifrado cambió y no puedes abrir la clave de este chat."
        : "Preparando el cifrado… Esperando a que la otra persona complete el suyo.";
    return "";
  }, [channel, keys, keyError, role]);

  const sendEncrypted = async (text: string, tipo: 1 | 3) => {
    const v = keys!.usable!;
    const payload = encryptText(keys!.keys.get(v)!, text, {
      canal: String(canalId),
      emisor: me.id,
      version: v,
      tipo,
    });
    if (tipo === 3) await chatApi.panic(canalId, payload);
    else await chatApi.send(canalId, { ...payload, tipoMensaje: 1 });
    await refreshMessages();
    onChanged?.();
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || blocked || sending) return;
    if (text.length > MAX_CHARS)
      return setNotice(`El mensaje admite hasta ${MAX_CHARS} caracteres.`);
    setSending(true);
    setNotice("");
    try {
      await sendEncrypted(text, 1);
      setDraft("");
    } catch (e) {
      setNotice(errText(e));
    } finally {
      setSending(false);
    }
  };

  const panic = async () => {
    if (blocked) return;
    const ok = await confirmAsync(
      "Enviar alerta de pánico",
      "Se avisará de inmediato a tu psicólogo y se abrirá este chat. Esta función depende de que él esté disponible y no sustituye a los servicios de emergencia: si estás en peligro inmediato, llama al 911.",
      "Enviar alerta",
      "Cancelar",
    );
    if (!ok) return;
    setBusyAction(true);
    setNotice("");
    try {
      await sendEncrypted(PANIC_TEXT, 3);
      setNotice("Alerta enviada. Tu psicólogo fue notificado.");
    } catch (e) {
      setNotice(errText(e));
    } finally {
      setBusyAction(false);
    }
  };

  const toggleEnabled = async () => {
    setBusyAction(true);
    setNotice("");
    try {
      const upd = await chatApi.enable(
        canalId,
        !channel.habilitado_por_psicologo,
      );
      setChannel((c) => ({ ...c, ...upd }));
      onChanged?.();
    } catch (e) {
      setNotice(errText(e));
    } finally {
      setBusyAction(false);
    }
  };

  const closeChannel = async () => {
    const ok = await confirmAsync(
      "Cerrar conversación",
      "Nadie podrá enviar más mensajes en este chat. El historial se conserva. ¿Cerrar?",
      "Cerrar chat",
      "Volver",
    );
    if (!ok) return;
    setBusyAction(true);
    try {
      const upd = await chatApi.close(canalId);
      setChannel((c) => ({ ...c, ...upd }));
      onChanged?.();
    } catch (e) {
      setNotice(errText(e));
    } finally {
      setBusyAction(false);
    }
  };

  const renew = async () => {
    const ok = await confirmAsync(
      "Renovar el cifrado del chat",
      "Se creará una clave nueva para este chat. Los mensajes anteriores cifrados con la clave que perdiste seguirán sin poder leerse en este dispositivo.",
      "Renovar",
      "Volver",
    );
    if (!ok || !keys) return;
    setBusyAction(true);
    try {
      await renewChannelKey(channel, me, keys.highest);
      await refreshKeys(channel);
    } catch (e) {
      setNotice(errText(e));
    } finally {
      setBusyAction(false);
    }
  };

  const hide = async (m: ChatMessage) => {
    const ok = await confirmAsync(
      "Ocultar mensaje",
      "Solo se oculta para ti; la otra persona lo seguirá viendo.",
      "Ocultar",
      "Volver",
    );
    if (!ok) return;
    try {
      await chatApi.hide(m.idMensaje);
      setMessages((prev) => prev.filter((x) => x.idMensaje !== m.idMensaje));
    } catch (e) {
      setNotice(errText(e));
    }
  };

  /* ------------------------------- vista ------------------------------- */
  const code = peerPub ? securityCode(me.pub, peerPub) : null;
  const estado = !channel.abierto
    ? { t: "Cerrado", tone: "off" as const }
    : channel.habilitado_por_psicologo
      ? { t: "Habilitado", tone: "ok" as const }
      : { t: "Deshabilitado", tone: "warn" as const };

  const renderRow = ({ item }: { item: Row }) => {
    if (item.k === "day")
      return (
        <View className="my-2 items-center">
          <Text className="font-sans text-xs text-muted">{item.label}</Text>
        </View>
      );
    const { m, text } = item;
    const mine = m.idEmisor === me.id;
    const panicMsg = m.tipoMensaje === 3;
    const unreadable = text === null;
    return (
      <View
        className={cn("my-1 max-w-[85%]", mine ? "self-end" : "self-start")}
      >
        <View
          className={cn(
            "rounded-nf px-3.5 py-2.5",
            panicMsg
              ? "border border-danger bg-surface"
              : mine
                ? "bg-primary"
                : "border border-border bg-surface",
          )}
        >
          {unreadable ? (
            <Text
              className={cn(
                "font-sans text-sm italic",
                mine && !panicMsg ? "text-white" : "text-muted",
              )}
            >
              🔒 No se pudo descifrar este mensaje en este dispositivo.
            </Text>
          ) : (
            <Text
              selectable
              className={cn(
                "font-sans text-[15px] leading-6",
                mine && !panicMsg ? "text-white" : "text-ink",
              )}
            >
              {text}
            </Text>
          )}
        </View>
        <View
          className={cn(
            "mt-0.5 flex-row items-center gap-2",
            mine && "self-end",
          )}
        >
          <Text className="font-sans text-[11px] text-muted">
            {hhmm(m.fechaEnvio)}
            {mine
              ? m.leido
                ? "  ✓✓ Leído"
                : m.entregado
                  ? "  ✓ Entregado"
                  : "  Enviado"
              : ""}
          </Text>
          <Pressable
            onPress={() => void hide(m)}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text className="font-sans text-[11px] text-muted underline">
              Ocultar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Encabezado */}
      <View className="gap-2 border-b border-border pb-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-1">
            {onBack ? (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text className="font-sans text-sm text-primary">
                  ← Conversaciones
                </Text>
              </Pressable>
            ) : null}
            <H2 numberOfLines={1}>{title}</H2>
          </View>
          <Pill text={estado.t} tone={estado.tone} />
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          {role === 2 && channel.abierto ? (
            <>
              <Button
                title={
                  channel.habilitado_por_psicologo
                    ? "Deshabilitar"
                    : "Habilitar chat"
                }
                variant={
                  channel.habilitado_por_psicologo ? "secondary" : "success"
                }
                loading={busyAction}
                onPress={() => void toggleEnabled()}
              />
              <Button
                title="Cerrar chat"
                variant="secondary"
                onPress={() => void closeChannel()}
              />
            </>
          ) : null}
          {role === 1 && channel.abierto ? (
            <Button
              title="Botón de pánico"
              variant="danger"
              disabled={!!blocked || busyAction}
              onPress={() => void panic()}
            />
          ) : null}
          <Pressable
            onPress={() => setShowCode((v) => !v)}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text className="font-sans text-sm text-primary underline">
              {showCode ? "Ocultar código de seguridad" : "Código de seguridad"}
            </Text>
          </Pressable>
        </View>
        {showCode ? (
          <View className="rounded-nf-sm border border-border bg-background p-3">
            {code ? (
              <>
                <Text
                  selectable
                  className="font-sans text-base font-semibold tracking-widest text-ink"
                >
                  {code}
                </Text>
                <Muted className="mt-1">
                  Compáralo con la otra persona por otro medio (en consulta, por
                  ejemplo). Si coincide, nadie intercepta sus claves.
                </Muted>
              </>
            ) : (
              <Muted>
                Disponible cuando la otra persona active su cifrado.
              </Muted>
            )}
          </View>
        ) : null}
      </View>

      {/* Mensajes */}
      <View className="flex-1 py-2">
        {!loaded ? (
          <Muted className="mt-6 text-center">Cargando conversación…</Muted>
        ) : rows.length === 0 ? (
          <Muted className="mt-6 text-center">
            Aún no hay mensajes. Todo lo que escribas se cifra en tu
            dispositivo.
          </Muted>
        ) : (
          <FlatList
            inverted
            data={[...rows].reverse()}
            keyExtractor={(r) => r.id}
            renderItem={renderRow}
            ListFooterComponent={
              hasMore ? (
                <Pressable
                  onPress={() => void loadOlder()}
                  className="items-center py-3"
                >
                  <Text className="font-sans text-sm text-primary underline">
                    Cargar mensajes anteriores
                  </Text>
                </Pressable>
              ) : null
            }
          />
        )}
      </View>

      {/* Avisos y redacción */}
      <View className="gap-2 border-t border-border pt-3">
        {notice ? (
          <Text className="font-sans text-sm text-danger">{notice}</Text>
        ) : null}
        {blocked ? (
          <View className="gap-2">
            <Muted>{blocked}</Muted>
            {keys && keys.usable === null && keys.unreadable.length > 0 ? (
              <Button
                title="Renovar cifrado del chat"
                variant="secondary"
                className="self-start"
                loading={busyAction}
                onPress={() => void renew()}
              />
            ) : null}
          </View>
        ) : null}
        <View className="flex-row items-end gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={!blocked && !sending}
            multiline
            maxLength={MAX_CHARS}
            placeholder={blocked ? "No disponible" : "Escribe un mensaje…"}
            placeholderTextColor="#6B6B7C"
            onKeyPress={(e: any) => {
              if (
                Platform.OS === "web" &&
                e.nativeEvent?.key === "Enter" &&
                !e.nativeEvent?.shiftKey
              ) {
                e.preventDefault?.();
                void send();
              }
            }}
            className="max-h-32 min-h-11 flex-1 rounded-nf-sm border border-border bg-surface px-3.5 py-2.5 font-sans text-[15px] text-ink"
          />
          <Button
            title="Enviar"
            loading={sending}
            disabled={!!blocked || !draft.trim()}
            onPress={() => void send()}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
