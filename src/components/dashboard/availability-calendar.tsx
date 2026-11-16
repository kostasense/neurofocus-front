import { appointmentsApi } from "@/api/appointments";
import { useLoad } from "@/hooks/use-load";
import {
    dayKey,
    freeByDay,
    monthMatrix,
    slotsForDay,
    startOfMonth,
    type Interval,
} from "@/lib/availability";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const monthLabel = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(
    d,
  );
const slotLabel = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

/**
 * Calendario compacto de solo lectura: marca los días con horarios libres del
 * psicólogo. Tocar un día o un horario lleva a la pantalla de agendar.
 */
export function AvailabilityCalendar({
  psychologistId,
  duracion,
  own,
  onOpen,
}: {
  psychologistId: number;
  duracion: number;
  /** Citas activas del propio paciente (no se le ofrecen horarios que se empalman). */
  own: Interval[];
  onOpen: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

  const data = useLoad(async () => {
    const [schedules, busy] = await Promise.all([
      appointmentsApi.schedules(psychologistId),
      appointmentsApi.busy(
        psychologistId,
        startOfMonth(month).toISOString(),
        startOfMonth(month, 1).toISOString(),
      ),
    ]);
    return { schedules, busy };
  }, [psychologistId, monthKey]);

  const schedules = data.data?.schedules ?? [];
  const busy = data.data?.busy ?? [];

  const free = useMemo(
    () => freeByDay(month, schedules, duracion, busy, own),
    [month, data.data, duracion, own],
  );

  // Próximos horarios libres del mes mostrado.
  const next = useMemo(() => {
    const out: Date[] = [];
    for (const week of monthMatrix(month))
      for (const day of week) {
        if (!day || out.length >= 3) continue;
        if ((free.get(dayKey(day)) ?? 0) === 0) continue;
        const first = slotsForDay(day, schedules, duracion, busy, own).find(
          (s) => s.status === "libre",
        );
        if (first) out.push(first.start);
      }
    return out;
  }, [free, month, schedules, duracion, busy, own]);

  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() &&
    month.getMonth() === today.getMonth();
  const change = (d: number) => setMonth((m) => startOfMonth(m, d));

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          disabled={isCurrentMonth}
          onPress={() => change(-1)}
          className={cn(
            "h-9 w-9 items-center justify-center",
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
          className="h-9 w-9 items-center justify-center"
        >
          <Text className="font-sans text-2xl text-ink">›</Text>
        </Pressable>
      </View>

      {data.error ? (
        <Text className="font-sans text-sm text-danger">{data.error}</Text>
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
              if (!day) return <View key={di} className="h-10 flex-1" />;
              const n = free.get(dayKey(day)) ?? 0;
              const enabled = n > 0 && !data.loading;
              const isToday = dayKey(day) === dayKey(today);
              return (
                <Pressable
                  key={di}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.getDate()}, ${n} horarios libres`}
                  disabled={!enabled}
                  onPress={onOpen}
                  className={cn(
                    "h-10 flex-1 items-center justify-center rounded-nf-sm border",
                    enabled
                      ? "border-primary bg-primary-light"
                      : "border-transparent",
                    isToday && !enabled && "border-border",
                    !enabled && "opacity-45",
                  )}
                >
                  <Text className="font-sans text-sm text-ink">
                    {day.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View className="flex-row items-center gap-2">
        <View className="h-3 w-3 rounded-sm border border-primary bg-primary-light" />
        <Text className="font-sans text-xs text-muted">
          Día con horarios libres
        </Text>
      </View>

      {next.length > 0 ? (
        <View className="gap-2">
          <Text className="font-sans text-sm font-medium text-ink">
            Próximos horarios libres
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {next.map((d) => (
              <Pressable
                key={d.getTime()}
                accessibilityRole="button"
                onPress={onOpen}
                className="rounded-full border border-primary bg-primary-light px-3 py-1.5"
              >
                <Text className="font-sans text-sm capitalize text-primary-dark">
                  {slotLabel(d)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : !data.loading && !data.error ? (
        <Text className="font-sans text-sm text-muted">
          No hay horarios libres este mes. Prueba con el mes siguiente.
        </Text>
      ) : null}
    </View>
  );
}
