import { assignmentsApi } from "@/api/assignments";
import { chatApi } from "@/api/chat";
import { EmptyState } from "@/components/feedback/empty-state";
import { Loading } from "@/components/feedback/loading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import type { Me } from "@/lib/chat-keys";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { ChatChannel } from "@/types/api";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Conversation } from "./conversation";

type Candidate = { idOtro: number; nombre: string };

const WIDE = 900;
const REFRESH_MS = 20000;

const errText = (e: any) =>
  e?.response?.data?.message ?? e?.message ?? "No se pudo cargar";

/**
 * Lista de conversaciones + conversación abierta. Lo usan paciente (rol 1) y
 * psicólogo (rol 2). En pantallas anchas se ven lado a lado; en móvil, una a la vez.
 */
export function ChatWorkspace({
  me,
  role,
  initialCanal,
}: {
  me: Me;
  role: 1 | 2;
  initialCanal?: string;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

  const [channels, setChannels] = useState<ChatChannel[] | null>(null);
  const [allChannels, setAllChannels] = useState<ChatChannel[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(initialCanal ?? null);
  const [creating, setCreating] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const all = await chatApi.channels();
      let active = all;
      let cands: Candidate[] = [];
      // Solo asignaciones activas: el paciente tiene una; el psicólogo, varias.
      if (role === 2) {
        const assigned = (await (
          assignmentsApi.patients(me.id) as Promise<any[]>
        ).catch(() => null)) as
          | { id_paciente: number; paciente: string }[]
          | null;
        if (assigned) {
          const ids = new Set(assigned.map((a) => a.id_paciente));
          active = all.filter((c) => ids.has(c.id_paciente));
          cands = assigned
            .filter((a) => !all.some((c) => c.id_paciente === a.id_paciente))
            .map((a) => ({ idOtro: a.id_paciente, nombre: a.paciente }));
        }
      } else {
        const cur = (await (
          assignmentsApi.current(me.id) as Promise<any>
        ).catch(() => null)) as {
          id_psicologo: number;
          psicologo: string;
        } | null;
        active = cur
          ? all.filter((c) => c.id_psicologo === cur.id_psicologo)
          : [];
        if (cur && !active.length)
          cands = [{ idOtro: cur.id_psicologo, nombre: cur.psicologo }];
      }
      setAllChannels(all);
      setChannels(active);
      setCandidates(cands);
      setError("");
    } catch (e) {
      setError(errText(e));
      setChannels((prev) => prev ?? []);
    }
  }, [me.id, role]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const start = async (c: Candidate) => {
    setCreating(c.idOtro);
    setError("");
    try {
      const ch = await chatApi.createChannel(
        role === 2
          ? { idPaciente: c.idOtro, idPsicologo: me.id }
          : { idPaciente: me.id, idPsicologo: c.idOtro },
      );
      await refresh();
      if (role === 2) setSelected(String(ch.id_canal));
    } catch (e) {
      setError(errText(e));
    } finally {
      setCreating(null);
    }
  };

  if (!channels) return <Loading />;

  // Paciente: solo existe su conversación con el psicólogo asignado (sin lista).
  const patientChannel =
    role === 1
      ? (channels.find((c) => c.abierto) ?? channels[0] ?? null)
      : null;
  const current =
    role === 1
      ? patientChannel
      : (channels.find((c) => String(c.id_canal) === selected) ??
        allChannels.find((c) => String(c.id_canal) === selected) ??
        null);
  const nameOf = (c: ChatChannel) =>
    (role === 2 ? c.paciente : c.psicologo) ?? "Conversación";

  const list = (
    <View className="gap-3">
      {channels.map((c) => {
        const on = String(c.id_canal) === selected;
        const state = !c.abierto
          ? "Cerrado"
          : c.habilitado_por_psicologo
            ? "Habilitado"
            : "Deshabilitado";
        return (
          <Pressable
            key={c.id_canal}
            accessibilityRole="button"
            onPress={() => setSelected(String(c.id_canal))}
            className={cn(
              "rounded-nf border p-4",
              on ? "border-primary bg-surface" : "border-border bg-surface",
            )}
          >
            <Text className="font-sans text-[15px] font-semibold text-ink">
              {nameOf(c)}
            </Text>
            <Muted>
              {state}
              {c.ultima_actividad
                ? ` · ${formatDateTime(c.ultima_actividad)}`
                : ""}
            </Muted>
          </Pressable>
        );
      })}

      {candidates.map((c) => (
        <Card key={c.idOtro} className="gap-2">
          <Text className="font-sans text-[15px] font-semibold text-ink">
            {c.nombre}
          </Text>
          <Muted>Aún no hay una conversación.</Muted>
          <Button
            title="Iniciar conversación"
            variant="secondary"
            className="self-start"
            loading={creating === c.idOtro}
            onPress={() => void start(c)}
          />
        </Card>
      ))}

      {!channels.length && !candidates.length ? (
        <EmptyState
          message={
            role === 2
              ? "Aún no tienes pacientes asignados para chatear."
              : "Aún no tienes un psicólogo asignado."
          }
        />
      ) : null}
    </View>
  );

  const conversation = current ? (
    <Conversation
      key={current.id_canal}
      channel={current}
      me={me}
      role={role}
      title={nameOf(current)}
      onBack={wide ? undefined : () => setSelected(null)}
      onChanged={() => void refresh()}
    />
  ) : (
    <View className="flex-1 items-center justify-center p-6">
      <Muted className="text-center">
        Selecciona una conversación para empezar.
      </Muted>
    </View>
  );

  if (role === 1) {
    const cand = candidates[0];
    return (
      <View className="flex-1">
        {error ? (
          <Text className="mb-2 font-sans text-sm text-danger">{error}</Text>
        ) : null}
        {patientChannel ? (
          <View className="mx-auto w-full max-w-[760px] flex-1 rounded-nf border border-border bg-surface px-4 pb-4 pt-3">
            <Conversation
              key={patientChannel.id_canal}
              channel={patientChannel}
              me={me}
              role={1}
              title={nameOf(patientChannel)}
              onChanged={() => void refresh()}
            />
          </View>
        ) : cand ? (
          <Card className="mx-auto w-full max-w-[520px] gap-3">
            <Text className="font-sans text-[15px] font-semibold text-ink">
              {cand.nombre}
            </Text>
            <Muted>Tu psicólogo asignado. Aún no hay una conversación.</Muted>
            <Button
              title="Iniciar conversación"
              className="self-start"
              loading={creating === cand.idOtro}
              onPress={() => void start(cand)}
            />
          </Card>
        ) : (
          <EmptyState message="Aún no tienes un psicólogo asignado." />
        )}
      </View>
    );
  }

  const errorLine = error ? (
    <Text className="mb-2 font-sans text-sm text-danger">{error}</Text>
  ) : null;

  if (wide)
    return (
      <View className="flex-1">
        {errorLine}
        <View className="flex-1 flex-row gap-6">
          <View className="w-[320px]">{list}</View>
          <View className="flex-1 rounded-nf border border-border bg-surface px-4 pb-4 pt-3">
            {conversation}
          </View>
        </View>
      </View>
    );

  return (
    <View className="flex-1">
      {errorLine}
      {current ? conversation : list}
    </View>
  );
}
