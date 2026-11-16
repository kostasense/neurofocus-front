import { chatApi } from "@/api/chat";
import { patientsApi } from "@/api/patients";
import { EmptyState } from "@/components/feedback/empty-state";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H1, Muted } from "@/components/ui/typography";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { confirmAsync } from "@/lib/confirm";
import { formatDateTime } from "@/lib/format";
import { CONTACTOS_PRIORITARIOS } from "@/lib/instruments";
import type { PanicAlert } from "@/types/api";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Catálogos y utilidades                                              */
/* ------------------------------------------------------------------ */
const ESTADO: Record<number, string> = {
  1: "Emitida",
  2: "Notificada",
  3: "Vista",
  4: "Atendida",
  5: "Cerrada",
};
const CONTACTO: Record<number, string> = {
  1: "Correo electrónico",
  2: "Teléfono",
  3: "Notificación en la plataforma",
};
const REFRESH_MS = 30_000;

type FilterKey = "activas" | "atendidas" | "cerradas" | "todas";
type PatientContact = {
  correo: string;
  telefono: string | null;
  telefonoConfianza: string | null;
  contactoPreferido: 1 | 2 | 3 | null;
};

const isActive = (a: PanicAlert) => a.estado < 4;

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

/** "3 min", "2 h 5 min", "1 d 4 h" entre dos fechas ISO. */
function elapsed(from: string, to: string | number = Date.now()) {
  const ms = Math.max(0, new Date(to).getTime() - new Date(from).getTime());
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
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
  tone: "ok" | "muted" | "warn" | "danger";
}) {
  return (
    <Text
      className={cn(
        "rounded-nf-sm px-2 py-0.5 font-sans text-xs",
        tone === "ok" && "bg-primary-light text-primary-dark",
        tone === "warn" && "bg-amber-100 text-amber-800",
        tone === "danger" && "bg-red-100 text-danger",
        tone === "muted" && "bg-border text-muted",
      )}
    >
      {text}
    </Text>
  );
}
const tone = (estado: number) =>
  estado <= 2
    ? "danger"
    : estado === 3
      ? "warn"
      : estado === 4
        ? "ok"
        : "muted";

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card
      className={cn("min-w-[140px] flex-1 gap-1", danger && "border-danger")}
    >
      <Muted>{label}</Muted>
      <Text
        className={cn(
          "font-sans text-xl font-semibold",
          danger ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </Text>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de alerta                                                   */
/* ------------------------------------------------------------------ */
function AlertCard({
  a,
  onChanged,
  onMessage,
}: {
  a: PanicAlert;
  onChanged: () => void;
  onMessage: (m: string) => void;
}) {
  const [open, setOpen] = useState(isActive(a));
  const [contact, setContact] = useState<PatientContact | null>(null);
  const [contactError, setContactError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || contact || contactError) return;
    let alive = true;
    (patientsApi.get(a.id_paciente) as Promise<PatientContact>)
      .then((r) => alive && setContact(r))
      .catch(
        (e) =>
          alive && setContactError(errMsg(e, "No se pudo cargar el contacto")),
      );
    return () => {
      alive = false;
    };
  }, [open]);

  const setStatus = async (estado: 3 | 4 | 5) => {
    if (estado === 5) {
      const ok = await confirmAsync(
        "Cerrar alerta",
        "La alerta quedará cerrada y ya no se mostrará como activa. El estado no puede retroceder.",
        "Cerrar alerta",
        "Volver",
      );
      if (!ok) return;
    }
    setBusy(estado);
    setError("");
    try {
      await chatApi.alertStatus(Number(a.id_alerta), estado);
      onMessage(
        estado === 3
          ? "La alerta se marcó como vista."
          : estado === 4
            ? "La alerta se marcó como atendida."
            : "La alerta fue cerrada.",
      );
      onChanged();
    } catch (e) {
      setError(errMsg(e, "No fue posible actualizar la alerta"));
    } finally {
      setBusy(null);
    }
  };

  const active = isActive(a);

  return (
    <Card className={cn("gap-3", active && "border-danger")}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="font-sans text-base font-semibold text-ink">
            {a.paciente ?? `Paciente #${a.id_paciente}`}
          </Text>
          <Pill text={ESTADO[a.estado]} tone={tone(a.estado)} />
        </View>
        <Muted>
          {formatDateTime(a.fecha_alerta)}
          {active ? ` · hace ${elapsed(a.fecha_alerta)}` : ""}
        </Muted>
        {a.fecha_vista ? (
          <Muted>
            Vista el {formatDateTime(a.fecha_vista)} (tras{" "}
            {elapsed(a.fecha_alerta, a.fecha_vista)})
          </Muted>
        ) : null}
        {a.fecha_atencion ? (
          <Muted>
            Atendida el {formatDateTime(a.fecha_atencion)} (tras{" "}
            {elapsed(a.fecha_alerta, a.fecha_atencion)})
          </Muted>
        ) : null}
      </Pressable>

      {open ? (
        <View className="gap-3 border-t border-border pt-3">
          {active ? (
            <Text className="rounded-nf-sm bg-red-50 p-3 font-sans text-sm text-danger">
              El paciente activó el botón de pánico. Contáctalo de inmediato. El
              mensaje de la alerta va cifrado de extremo a extremo y se lee en
              el chat.
            </Text>
          ) : null}

          <View className="gap-1">
            <Text className="font-sans text-sm font-semibold text-ink">
              Contacto del paciente
            </Text>
            {contactError ? (
              <Text className="font-sans text-sm text-danger">
                {contactError}
              </Text>
            ) : !contact ? (
              <Muted>Cargando…</Muted>
            ) : (
              <>
                <Text className="font-sans text-[14px] text-ink">
                  Correo: {contact.correo}
                </Text>
                <Text className="font-sans text-[14px] text-ink">
                  Teléfono: {contact.telefono ?? "No registrado"}
                </Text>
                <Text className="font-sans text-[14px] text-ink">
                  Teléfono de confianza:{" "}
                  {contact.telefonoConfianza ?? "No registrado"}
                </Text>
                <Muted>
                  Prefiere:{" "}
                  {contact.contactoPreferido
                    ? CONTACTO[contact.contactoPreferido]
                    : "Sin preferencia"}
                </Muted>
              </>
            )}
          </View>

          {CONTACTOS_PRIORITARIOS.length > 0 ? (
            <View className="gap-1">
              <Text className="font-sans text-sm font-semibold text-ink">
                Medios de atención prioritaria
              </Text>
              {CONTACTOS_PRIORITARIOS.map((c) => (
                <Muted key={c.nombre}>
                  {c.nombre}: {c.detalle}
                </Muted>
              ))}
            </View>
          ) : null}

          {error ? (
            <Text className="font-sans text-sm text-danger">{error}</Text>
          ) : null}

          <View className="flex-row flex-wrap gap-2">
            <Button
              title="Abrir chat"
              onPress={() =>
                router.push({
                  pathname: "/(app)/psychologist/chat",
                  params: { canal: String(a.id_canal) },
                })
              }
            />
            {a.estado < 3 ? (
              <Button
                title="Marcar como vista"
                variant="secondary"
                loading={busy === 3}
                onPress={() => void setStatus(3)}
              />
            ) : null}
            {a.estado < 4 ? (
              <Button
                title="Marcar como atendida"
                variant="success"
                loading={busy === 4}
                onPress={() => void setStatus(4)}
              />
            ) : null}
            {a.estado < 5 ? (
              <Button
                title="Cerrar alerta"
                variant="secondary"
                loading={busy === 5}
                onPress={() => void setStatus(5)}
              />
            ) : null}
            <Button
              title="Ver expediente"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/(app)/psychologist/records",
                  params: { paciente: String(a.id_paciente) },
                })
              }
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Alerts() {
  const q = useLoad<PanicAlert[]>(() => chatApi.alerts());
  const [filter, setFilter] = useState<FilterKey>("activas");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  // Actualización periódica: una alerta nueva debe verse sin recargar a mano.
  useEffect(() => {
    const t = setInterval(() => void q.reload(), REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  if (q.loading && !q.data) return <Loading />;

  const all = q.data ?? [];
  const counts = {
    activas: all.filter(isActive).length,
    atendidas: all.filter((a) => a.estado === 4).length,
    cerradas: all.filter((a) => a.estado === 5).length,
    todas: all.length,
  };
  const list = all
    .filter((a) =>
      filter === "activas"
        ? isActive(a)
        : filter === "atendidas"
          ? a.estado === 4
          : filter === "cerradas"
            ? a.estado === 5
            : true,
    )
    .filter((a) =>
      (a.paciente ?? "").toLowerCase().includes(search.trim().toLowerCase()),
    )
    // Activas primero (las más antiguas sin atender arriba), después por fecha.
    .sort((a, b) =>
      isActive(a) !== isActive(b)
        ? isActive(a)
          ? -1
          : 1
        : isActive(a)
          ? +new Date(a.fecha_alerta) - +new Date(b.fecha_alerta)
          : +new Date(b.fecha_alerta) - +new Date(a.fecha_alerta),
    );

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mx-auto w-full max-w-[760px] gap-5">
          <View className="gap-1">
            <H1>Alertas</H1>
            <Muted>
              Alertas de pánico de tus pacientes. Se actualizan solas cada 30
              segundos.
            </Muted>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <Stat
              label="Activas"
              value={String(counts.activas)}
              danger={counts.activas > 0}
            />
            <Stat label="Atendidas" value={String(counts.atendidas)} />
            <Stat label="Cerradas" value={String(counts.cerradas)} />
          </View>

          {message ? (
            <Text className="rounded-nf-sm bg-primary-light p-3 font-sans text-sm text-primary-dark">
              {message}
            </Text>
          ) : null}

          <View className="gap-3">
            <Choice
              value={filter}
              onChange={setFilter}
              options={[
                {
                  value: "activas" as FilterKey,
                  label: `Activas (${counts.activas})`,
                },
                {
                  value: "atendidas" as FilterKey,
                  label: `Atendidas (${counts.atendidas})`,
                },
                {
                  value: "cerradas" as FilterKey,
                  label: `Cerradas (${counts.cerradas})`,
                },
                {
                  value: "todas" as FilterKey,
                  label: `Todas (${counts.todas})`,
                },
              ]}
            />
            <Input
              placeholder="Buscar por paciente"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          {q.error ? (
            <Text className="font-sans text-sm text-danger">{q.error}</Text>
          ) : null}

          {list.length === 0 ? (
            <EmptyState
              message={
                filter === "activas"
                  ? "No tienes alertas activas."
                  : "No hay alertas con estos filtros."
              }
            />
          ) : (
            list.map((a) => (
              <AlertCard
                key={String(a.id_alerta)}
                a={a}
                onChanged={() => void q.reload()}
                onMessage={setMessage}
              />
            ))
          )}
        </View>
      </Screen>
    </>
  );
}
