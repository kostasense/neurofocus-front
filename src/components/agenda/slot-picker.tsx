import { appointmentsApi } from "@/api/appointments";
import { Muted } from "@/components/ui/typography";
import { useLoad } from "@/hooks/use-load";
import {
    dayKey,
    freeByDay,
    monthMatrix,
    slotsForDay,
    startOfMonth,
    type Interval,
    type Schedule,
    type Slot,
} from "@/lib/availability";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

const MODALIDAD: Record<number, string> = { 1: "Presencial", 2: "Virtual" };
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const monthLabel = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(
    d,
  );
const dayLabel = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
export const timeLabel = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(d);
export const slotLabel = (s: Slot) =>
  `${new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(s.start)}, ${timeLabel(s.start)} – ${timeLabel(s.end)}`;

/**
 * Calendario mensual con los horarios libres de un psicólogo, calculados a
 * partir de sus bloques (UTC) y de las citas activas ya registradas.
 * `current` es el intervalo de la cita que se está reprogramando: sigue
 * contando como ocupado (no se puede reprogramar al mismo horario) y se rotula
 * "Horario actual".
 */
export function SlotPicker({
  psychologistId,
  schedules,
  duracionMin,
  current,
  value,
  onChange,
}: {
  psychologistId: number;
  schedules: Schedule[];
  duracionMin: number;
  current?: Interval | null;
  value: Slot | null;
  onChange: (s: Slot | null) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selDay, setSelDay] = useState<Date | null>(null);

  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  const busyQ = useLoad<Interval[]>(
    () =>
      appointmentsApi.busy(
        psychologistId,
        startOfMonth(month).toISOString(),
        startOfMonth(month, 1).toISOString(),
      ),
    [psychologistId, monthKey],
  );

  const busy = busyQ.data ?? [];
  const isCurrent = (s: Slot) =>
    !!current &&
    s.start.getTime() < new Date(current.fin).getTime() &&
    s.end.getTime() > new Date(current.inicio).getTime();
  const free = useMemo(
    () => freeByDay(month, schedules, duracionMin, busy, []),
    [month, schedules, duracionMin, busyQ.data],
  );
  const slots = selDay
    ? slotsForDay(selDay, schedules, duracionMin, busy, [])
    : [];
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() &&
    month.getMonth() === today.getMonth();

  const change = (delta: number) => {
    setMonth((m) => startOfMonth(m, delta));
    setSelDay(null);
    onChange(null);
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          disabled={isCurrentMonth}
          onPress={() => change(-1)}
          className={cn(
            "h-10 w-10 items-center justify-center",
            isCurrentMonth && "opacity-30",
          )}
        >
          <Text className="font-sans text-2xl text-ink">‹</Text>
        </Pressable>
        <Text className="font-sans text-base font-semibold capitalize text-ink">
          {monthLabel(month)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          onPress={() => change(1)}
          className="h-10 w-10 items-center justify-center"
        >
          <Text className="font-sans text-2xl text-ink">›</Text>
        </Pressable>
      </View>

      {busyQ.error ? (
        <Text className="font-sans text-sm text-danger">{busyQ.error}</Text>
      ) : null}

      <View className="gap-1">
        <View className="flex-row">
          {DIAS.map((d) => (
            <Text
              key={d}
              className="flex-1 text-center font-sans text-xs text-muted"
            >
              {d}
            </Text>
          ))}
        </View>
        {monthMatrix(month).map((week, wi) => (
          <View key={wi} className="flex-row gap-1">
            {week.map((day, di) => {
              if (!day) return <View key={di} className="h-12 flex-1" />;
              const n = free.get(dayKey(day)) ?? 0;
              const selected = !!selDay && dayKey(selDay) === dayKey(day);
              const enabled = n > 0 && !busyQ.loading;
              return (
                <Pressable
                  key={di}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(day)}, ${n} horarios libres`}
                  disabled={!enabled}
                  onPress={() => {
                    setSelDay(day);
                    onChange(null);
                  }}
                  className={cn(
                    "h-12 flex-1 items-center justify-center rounded-nf-sm border",
                    selected
                      ? "border-primary bg-primary"
                      : enabled
                        ? "border-primary bg-primary-light"
                        : "border-transparent",
                    !enabled && "opacity-40",
                  )}
                >
                  <Text
                    className={cn(
                      "font-sans text-sm",
                      selected ? "font-semibold text-white" : "text-ink",
                    )}
                  >
                    {day.getDate()}
                  </Text>
                  {enabled ? (
                    <Text
                      className={cn(
                        "font-sans text-[10px]",
                        selected ? "text-white" : "text-primary-dark",
                      )}
                    >
                      {n} lib.
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {busyQ.loading ? <Muted>Cargando disponibilidad…</Muted> : null}
      {!busyQ.loading && schedules.filter((s) => s.activo).length === 0 ? (
        <Muted>
          Aún no tienes bloques de horario activos; créalos en la pestaña
          Horarios.
        </Muted>
      ) : null}

      {selDay ? (
        <View className="gap-2">
          <Text className="font-sans text-sm font-medium capitalize text-ink">
            {dayLabel(selDay)}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {slots.map((s) => {
              const on = value?.start.getTime() === s.start.getTime();
              const libre = s.status === "libre";
              return (
                <Pressable
                  key={`${s.blockId}-${s.start.getTime()}`}
                  accessibilityRole="button"
                  disabled={!libre}
                  onPress={() => onChange(s)}
                  className={cn(
                    "rounded-nf-sm border px-3 py-2",
                    on
                      ? "border-primary bg-primary"
                      : libre
                        ? "border-border bg-surface"
                        : "border-border bg-border opacity-50",
                  )}
                >
                  <Text
                    className={cn(
                      "font-sans text-sm",
                      on ? "font-semibold text-white" : "text-ink",
                    )}
                  >
                    {timeLabel(s.start)}
                  </Text>
                  <Text
                    className={cn(
                      "font-sans text-[10px]",
                      on ? "text-white" : "text-muted",
                    )}
                  >
                    {libre
                      ? MODALIDAD[s.modalidad]
                      : isCurrent(s)
                        ? "Horario actual"
                        : "Ocupado"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <Muted>Elige un día resaltado para ver los horarios.</Muted>
      )}
    </View>
  );
}
