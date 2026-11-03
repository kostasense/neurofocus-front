import { notificationsApi } from "@/api/notifications";
import { usersApi } from "@/api/users";
import { EmptyState } from "@/components/feedback/empty-state";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H1, H2, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { Notification, User } from "@/types/api";
import { ROLES } from "@/types/routes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Catálogos                                                           */
/* ------------------------------------------------------------------ */
const TIPO: Record<number, string> = {
  1: "Cita",
  2: "Chat",
  3: "Pánico",
  4: "Sistema",
};
const PRIORIDAD: Record<number, string> = {
  1: "Normal",
  2: "Alta",
  3: "Crítica",
};
const ROL: Record<number, string> = {
  1: "Pacientes",
  2: "Psicólogos",
  3: "Administradores",
};
const PAGE = 20;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (x: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */
function Choice<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            onPress={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5",
              on ? "border-primary bg-primary" : "border-border bg-surface",
            )}
          >
            <Text
              className={cn(
                "font-sans text-sm",
                on ? "font-semibold text-white" : "text-ink",
              )}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Pill({
  text,
  tone,
}: {
  text: string;
  tone?: "danger" | "warn" | "ok";
}) {
  return (
    <Text
      className={cn(
        "rounded-nf-sm px-2 py-0.5 font-sans text-xs",
        tone === "danger"
          ? "bg-danger/15 text-danger"
          : tone === "warn"
            ? "bg-warning/15 text-warning"
            : tone === "ok"
              ? "bg-primary-light text-primary-dark"
              : "bg-border text-muted",
      )}
    >
      {text}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de notificación                                             */
/* ------------------------------------------------------------------ */
function NotificationCard({
  n,
  busy,
  onToggle,
}: {
  n: Notification;
  busy: boolean;
  onToggle: () => void;
}) {
  const unread = !n.fecha_leida;
  return (
    <Card
      className={cn(
        "gap-2",
        unread && "border-l-4 border-l-primary",
        n.prioridad === 3 && "border-danger",
      )}
    >
      <View className="flex-row flex-wrap items-center gap-2">
        <Text
          className={cn(
            "flex-1 font-sans text-ink",
            unread ? "font-semibold" : "font-medium",
          )}
        >
          {n.titulo}
        </Text>
        {unread ? <Pill text="Nueva" tone="ok" /> : null}
      </View>

      <Text className="font-sans text-[15px] leading-6 text-ink">
        {n.cuerpo}
      </Text>

      <View className="flex-row flex-wrap items-center gap-2">
        <Pill text={TIPO[n.tipo]} />
        {n.prioridad > 1 ? (
          <Pill
            text={`Prioridad ${PRIORIDAD[n.prioridad].toLowerCase()}`}
            tone={n.prioridad === 3 ? "danger" : "warn"}
          />
        ) : null}
        {n.referencia_id != null ? (
          <Text className="font-sans text-xs text-muted">
            Ref. #{String(n.referencia_id)}
          </Text>
        ) : null}
      </View>

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Muted>
          {formatDateTime(n.fecha_creacion)}
          {n.fecha_leida ? ` · leída ${formatDateTime(n.fecha_leida)}` : ""}
        </Muted>
        <Button
          title={unread ? "Marcar como leída" : "Marcar como no leída"}
          variant="secondary"
          className="min-h-9 px-3 py-1.5"
          loading={busy}
          onPress={onToggle}
        />
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Envío de avisos (solo administrador)                                */
/* ------------------------------------------------------------------ */
type Mode = "uno" | "rol1" | "rol2" | "rol3" | "todos";

function SendForm({ onSent }: { onSent: () => void }) {
  const q = useLoad<User[]>(() => usersApi.list());
  const [mode, setMode] = useState<Mode>("uno");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [tipo, setTipo] = useState<number>(4);
  const [prioridad, setPrioridad] = useState<number>(1);
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  if (q.loading && !q.data) return <Loading />;

  const activos = (q.data ?? []).filter((u) => u.activo);
  const destinatarios: User[] =
    mode === "uno"
      ? selected
        ? [selected]
        : []
      : mode === "todos"
        ? activos
        : activos.filter((u) => u.id_rol === Number(mode.slice(3)));

  const term = norm(search.trim());
  const candidatos = term
    ? activos
        .filter((u) => norm(`${u.nombre} ${u.correo}`).includes(term))
        .slice(0, 6)
    : [];

  const reset = () => setConfirming(false);

  const submit = async () => {
    setError("");
    setOk("");
    if (!destinatarios.length)
      return setError(
        mode === "uno"
          ? "Elige a la persona que recibirá el aviso."
          : "No hay usuarios activos en ese grupo.",
      );
    if (!titulo.trim() || !cuerpo.trim())
      return setError("El título y el mensaje son obligatorios.");

    if (!confirming && destinatarios.length > 1) {
      setConfirming(true);
      return;
    }

    setBusy(true);
    const results = await mapLimit(destinatarios, 4, async (u) => {
      try {
        await notificationsApi.create({
          idUsuario: u.id_usuario,
          tipo,
          titulo: titulo.trim(),
          cuerpo: cuerpo.trim(),
          prioridad,
        });
        return true;
      } catch (e) {
        if (destinatarios.length === 1)
          setError(errMsg(e, "No se pudo enviar"));
        return false;
      }
    });
    setBusy(false);
    setConfirming(false);

    const enviados = results.filter(Boolean).length;
    const fallidos = results.length - enviados;
    if (enviados > 0) {
      setOk(
        `Aviso enviado a ${enviados} ${enviados === 1 ? "usuario" : "usuarios"}` +
          (fallidos ? `; falló para ${fallidos}.` : "."),
      );
      if (!fallidos) {
        setTitulo("");
        setCuerpo("");
      }
      onSent();
    } else if (destinatarios.length > 1) {
      setError("No se pudo enviar el aviso a ningún usuario.");
    }
  };

  return (
    <Card className="mb-6 gap-4">
      <H2>Enviar aviso</H2>

      <View className="gap-1.5">
        <Text className="font-sans text-sm font-medium text-ink">
          Destinatarios
        </Text>
        <Choice<Mode>
          value={mode}
          onChange={(v) => {
            setMode(v);
            reset();
          }}
          options={[
            { value: "uno", label: "Una persona" },
            { value: "rol1", label: ROL[1] },
            { value: "rol2", label: ROL[2] },
            { value: "rol3", label: ROL[3] },
            { value: "todos", label: "Todos" },
          ]}
        />
      </View>

      {mode === "uno" ? (
        selected ? (
          <View className="flex-row flex-wrap items-center justify-between gap-2 rounded-nf-sm border border-border p-3">
            <View className="flex-1">
              <Text className="font-sans font-semibold text-ink">
                {selected.nombre}
              </Text>
              <Muted>
                {selected.correo} · {ROL[selected.id_rol]}
              </Muted>
            </View>
            <Button
              title="Cambiar"
              variant="secondary"
              className="min-h-9 px-3 py-1.5"
              onPress={() => {
                setSelected(null);
                setSearch("");
              }}
            />
          </View>
        ) : (
          <View className="gap-2">
            <Input
              placeholder="Buscar por nombre o correo"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {candidatos.map((u) => (
              <Pressable
                key={u.id_usuario}
                accessibilityRole="button"
                onPress={() => {
                  setSelected(u);
                  reset();
                }}
                className="rounded-nf-sm border border-border p-3 active:opacity-80"
              >
                <Text className="font-sans font-semibold text-ink">
                  {u.nombre}
                </Text>
                <Muted>
                  {u.correo} · {ROL[u.id_rol]}
                </Muted>
              </Pressable>
            ))}
            {term && !candidatos.length ? (
              <Muted>Sin coincidencias entre los usuarios activos.</Muted>
            ) : null}
          </View>
        )
      ) : (
        <Muted>
          Se enviará una notificación individual a cada usuario activo (
          {destinatarios.length}).
        </Muted>
      )}

      <View className="gap-1.5">
        <Text className="font-sans text-sm font-medium text-ink">Tipo</Text>
        <Choice
          value={tipo}
          onChange={setTipo}
          options={Object.entries(TIPO).map(([k, label]) => ({
            value: Number(k),
            label,
          }))}
        />
      </View>
      <View className="gap-1.5">
        <Text className="font-sans text-sm font-medium text-ink">
          Prioridad
        </Text>
        <Choice
          value={prioridad}
          onChange={setPrioridad}
          options={Object.entries(PRIORIDAD).map(([k, label]) => ({
            value: Number(k),
            label,
          }))}
        />
      </View>

      <Input
        label="Título"
        value={titulo}
        onChangeText={(t) => {
          setTitulo(t);
          reset();
        }}
        maxLength={120}
      />
      <View className="gap-1">
        <Input
          label="Mensaje"
          value={cuerpo}
          onChangeText={(t) => {
            setCuerpo(t);
            reset();
          }}
          multiline
          maxLength={500}
          style={{ minHeight: 96, textAlignVertical: "top", paddingTop: 10 }}
        />
        <Text className="text-right font-sans text-xs text-muted">
          {cuerpo.length}/500
        </Text>
      </View>

      {error ? (
        <Text className="font-sans text-sm text-danger">{error}</Text>
      ) : null}
      {ok ? <Text className="font-sans text-sm text-success">{ok}</Text> : null}

      <View className="flex-row flex-wrap gap-2">
        <Button
          title={
            confirming
              ? `Confirmar envío a ${destinatarios.length} usuarios`
              : "Enviar aviso"
          }
          loading={busy}
          onPress={() => void submit()}
        />
        {confirming ? (
          <Button title="Cancelar" variant="secondary" onPress={reset} />
        ) : null}
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Notifications() {
  const { user } = useAuth();
  const isAdmin = user?.rol === ROLES.ADMIN;

  const [tipo, setTipo] = useState<number>(0); // 0 = todos
  const [prioridad, setPrioridad] = useState<number>(0);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const requestId = useRef(0);

  const fetchPage = useCallback(
    (offset: number) =>
      notificationsApi.mine({
        limite: PAGE,
        desplazamiento: offset,
        soloNoLeidas: soloNoLeidas || undefined,
        tipo: tipo || undefined,
        prioridad: prioridad || undefined,
      }),
    [tipo, prioridad, soloNoLeidas],
  );

  const refreshCount = useCallback(async () => {
    try {
      const r = await notificationsApi.unreadCount();
      setUnread(r.total);
    } catch {
      /* el contador es informativo */
    }
  }, []);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const rows = await fetchPage(0);
      if (id !== requestId.current) return;
      setItems(rows);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(errMsg(e, "No se pudieron cargar las notificaciones"));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
    void refreshCount();
  }, [fetchPage, refreshCount]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = async () => {
    setLoadingMore(true);
    setError("");
    try {
      const rows = await fetchPage(items.length);
      setItems((prev) => {
        const seen = new Set(prev.map((x) => String(x.id_notificacion)));
        return [
          ...prev,
          ...rows.filter((x) => !seen.has(String(x.id_notificacion))),
        ];
      });
      setHasMore(rows.length === PAGE);
    } catch (e) {
      setError(errMsg(e, "No se pudieron cargar más notificaciones"));
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = async (n: Notification) => {
    const key = String(n.id_notificacion);
    setBusyId(key);
    setError("");
    try {
      const updated = n.fecha_leida
        ? await notificationsApi.unread(Number(n.id_notificacion))
        : await notificationsApi.read(Number(n.id_notificacion));
      setItems((prev) =>
        soloNoLeidas && updated.fecha_leida
          ? prev.filter((x) => String(x.id_notificacion) !== key)
          : prev.map((x) => (String(x.id_notificacion) === key ? updated : x)),
      );
      void refreshCount();
    } catch (e) {
      setError(errMsg(e, "No se pudo actualizar la notificación"));
    } finally {
      setBusyId(null);
    }
  };

  const readAll = async () => {
    setBusyAll(true);
    setError("");
    try {
      await notificationsApi.readAll();
      await reload();
    } catch (e) {
      setError(errMsg(e, "No se pudieron marcar como leídas"));
    } finally {
      setBusyAll(false);
    }
  };

  const filtrando = tipo || prioridad || soloNoLeidas;

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mb-5 flex-row flex-wrap items-start justify-between gap-3">
          <View className="flex-1">
            <H1>Notificaciones</H1>
            <Muted>
              {unread == null
                ? "Avisos de citas, chat, alertas y sistema."
                : unread === 0
                  ? "Estás al día: no tienes notificaciones sin leer."
                  : `Tienes ${unread} ${unread === 1 ? "notificación sin leer" : "notificaciones sin leer"}.`}
            </Muted>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Button
              title="Marcar todas como leídas"
              variant="secondary"
              loading={busyAll}
              disabled={!unread}
              onPress={() => void readAll()}
            />
            {isAdmin ? (
              <Button
                title={showSend ? "Cerrar envío" : "Enviar aviso"}
                onPress={() => setShowSend((v) => !v)}
              />
            ) : null}
          </View>
        </View>

        {isAdmin && showSend ? <SendForm onSent={() => void reload()} /> : null}

        <View className="mb-5 gap-3">
          <Choice
            value={soloNoLeidas ? 1 : 0}
            onChange={(v) => setSoloNoLeidas(v === 1)}
            options={[
              { value: 0, label: "Todas" },
              { value: 1, label: "Sin leer" },
            ]}
          />
          <Choice
            value={tipo}
            onChange={setTipo}
            options={[
              { value: 0, label: "Todos los tipos" },
              ...Object.entries(TIPO).map(([k, label]) => ({
                value: Number(k),
                label,
              })),
            ]}
          />
          <Choice
            value={prioridad}
            onChange={setPrioridad}
            options={[
              { value: 0, label: "Cualquier prioridad" },
              ...Object.entries(PRIORIDAD).map(([k, label]) => ({
                value: Number(k),
                label,
              })),
            ]}
          />
          {filtrando ? (
            <Button
              title="Limpiar filtros"
              variant="secondary"
              onPress={() => {
                setTipo(0);
                setPrioridad(0);
                setSoloNoLeidas(false);
              }}
            />
          ) : null}
        </View>

        {error ? (
          <Text className="mb-4 font-sans text-sm text-danger">{error}</Text>
        ) : null}

        {loading && items.length === 0 ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState
            message={
              filtrando
                ? "Ninguna notificación coincide con los filtros."
                : "No tienes notificaciones."
            }
          />
        ) : (
          <View className="gap-3">
            {items.map((n) => (
              <NotificationCard
                key={String(n.id_notificacion)}
                n={n}
                busy={busyId === String(n.id_notificacion)}
                onToggle={() => void toggle(n)}
              />
            ))}
            {hasMore ? (
              <Button
                title="Cargar más"
                variant="secondary"
                loading={loadingMore}
                onPress={() => void loadMore()}
              />
            ) : (
              <Muted className="text-center">No hay más notificaciones.</Muted>
            )}
          </View>
        )}
      </Screen>
    </>
  );
}
