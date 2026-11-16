import { appointmentsApi } from "@/api/appointments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H2, Muted } from "@/components/ui/typography";
import { hhmm, type Schedule } from "@/lib/availability";
import { cn } from "@/lib/cn";
import { confirmAsync } from "@/lib/confirm";
import {
    localToUtcRows,
    minutesToTime,
    utcRowsToLocal,
    type LocalBlock,
} from "@/lib/schedule-time";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const MODALIDAD: Record<number, string> = { 1: "Presencial", 2: "Virtual" };
const HORA_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

type Mod = 1 | 2;
type Values = { dia: number; ini: number; fin: number; modalidad: Mod };

/** Error con mensaje ya listo para mostrar al usuario. */
class UserError extends Error {}

const errMsg = (e: any, fallback: string) => {
  if (e instanceof UserError) return e.message;
  const m = e?.response?.data?.message;
  if (e?.response?.status === 500)
    return "El servidor no pudo guardar el cambio (puede existir un bloque igual desactivado).";
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

/** "8:30" | "08:30" | "24:00" -> minutos, o null si no es válida. */
const parseHora = (v: string, esFin: boolean): number | null => {
  const t = v.trim();
  if (esFin && t === "24:00") return 1440;
  if (!HORA_RE.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (min: number) => (min >= 1440 ? "24:00" : minutesToTime(min));
const describe = (b: {
  dia_semana: number;
  inicioMin: number;
  finMin: number;
}) => `${DIAS[b.dia_semana - 1]} ${fmt(b.inicioMin)}–${fmt(b.finMin)}`;
const zonaDispositivo = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "tu zona horaria";
  }
};

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

function ErrorText({ text }: { text?: string }) {
  return text ? (
    <Text className="rounded-nf-sm bg-red-50 p-2.5 font-sans text-sm text-danger">
      {text}
    </Text>
  ) : null;
}

/* ------------------------------------------------------------------ */
/* Formulario (crear o editar un bloque)                               */
/* ------------------------------------------------------------------ */
function BlockForm({
  initial,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: LocalBlock;
  busy: boolean;
  error?: string;
  onSubmit: (v: Values) => void;
  onCancel?: () => void;
}) {
  const [dia, setDia] = useState(initial?.dia_semana ?? 1);
  const [ini, setIni] = useState(initial ? fmt(initial.inicioMin) : "08:00");
  const [fin, setFin] = useState(initial ? fmt(initial.finMin) : "12:00");
  const [modalidad, setModalidad] = useState<Mod>(initial?.modalidad ?? 1);
  const [localError, setLocalError] = useState("");

  const a = parseHora(ini, false);
  const b = parseHora(fin, true);
  // Al editar, solo se puede guardar si algo cambió.
  const dirty =
    !initial ||
    dia !== initial.dia_semana ||
    a !== initial.inicioMin ||
    b !== initial.finMin ||
    modalidad !== initial.modalidad;

  const submit = () => {
    if (a === null || b === null)
      return setLocalError("Usa el formato HH:mm (por ejemplo 08:00).");
    if (b <= a)
      return setLocalError("La hora de fin debe ser posterior a la de inicio.");
    setLocalError("");
    onSubmit({ dia, ini: a, fin: b, modalidad });
  };

  return (
    <View className="gap-3">
      <Choice
        value={dia}
        onChange={setDia}
        options={DIAS.map((label, i) => ({ value: i + 1, label }))}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Inicio (HH:mm)"
            value={ini}
            onChangeText={setIni}
            maxLength={5}
            autoCapitalize="none"
          />
        </View>
        <View className="flex-1">
          <Input
            label="Fin (HH:mm)"
            value={fin}
            onChangeText={setFin}
            maxLength={5}
            autoCapitalize="none"
          />
        </View>
      </View>
      <Choice
        value={modalidad}
        onChange={setModalidad}
        options={[
          { value: 1 as Mod, label: "Presencial" },
          { value: 2 as Mod, label: "Virtual" },
        ]}
      />
      <ErrorText text={localError || error} />
      {initial && !dirty ? <Muted>No hay cambios por guardar.</Muted> : null}
      <View className="flex-row flex-wrap gap-2">
        <Button
          title={initial ? "Guardar cambios" : "Agregar bloque"}
          loading={busy}
          disabled={!dirty || busy}
          className={!dirty ? "opacity-50" : undefined}
          onPress={submit}
        />
        {onCancel ? (
          <Button title="Cancelar" variant="secondary" onPress={onCancel} />
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pestaña                                                             */
/* ------------------------------------------------------------------ */
export function SchedulesTab({
  psychologistId,
  schedules,
  duracionMin,
  onChanged,
}: {
  psychologistId: number;
  /** Todas las filas (activas e inactivas) tal como las guarda el backend (UTC). */
  schedules: Schedule[];
  duracionMin: number;
  onChanged: () => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [ok, setOk] = useState("");
  const [fail, setFail] = useState<{ key: string; text: string } | null>(null);

  const active = utcRowsToLocal(schedules.filter((s) => s.activo));
  const inactive = utcRowsToLocal(
    schedules.filter((s) => !s.activo).map((s) => ({ ...s, activo: true })),
  );
  const keyOf = (b: LocalBlock) => b.ids.join("-");
  const rowOf = (id: number) =>
    schedules.find((s) => Number(s.id_horario) === id)!;
  const failFor = (k: string) => (fail?.key === k ? fail.text : undefined);

  const fieldsOf = (r: Schedule, activo = r.activo) => ({
    activo,
    diaSemana: r.dia_semana,
    horaInicio: hhmm(r.hora_inicio),
    horaFin: hhmm(r.hora_fin),
    modalidad: r.modalidad,
  });

  /** Bloque activo (en hora local) que se superpone con `v`, ignorando `ownIds`. */
  const overlapWith = (v: Values, ownIds: number[]) =>
    active.find(
      (o) =>
        !o.ids.some((id) => ownIds.includes(id)) &&
        o.dia_semana === v.dia &&
        v.ini < o.finMin &&
        v.fin > o.inicioMin,
    );
  /** Bloque desactivado idéntico a `v`, ignorando `ownIds`. */
  const inactiveTwin = (v: Values, ownIds: number[]) =>
    inactive.find(
      (o) =>
        !o.ids.some((id) => ownIds.includes(id)) &&
        o.dia_semana === v.dia &&
        o.inicioMin === v.ini &&
        o.finMin === v.fin &&
        o.modalidad === v.modalidad,
    );

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusyKey(key);
    setFail(null);
    setOk("");
    try {
      setOk(await fn());
    } catch (e) {
      setFail({ key, text: errMsg(e, "No fue posible guardar el cambio") });
    } finally {
      setBusyKey(null);
      onChanged();
    }
  };

  const activate = (id: number) => {
    const r = rowOf(id);
    return appointmentsApi.updateSchedule(id, fieldsOf(r, true));
  };

  /** Crea las filas UTC de un bloque; si una falla, elimina las ya creadas. */
  const createRows = async (v: Values): Promise<number[]> => {
    const created: number[] = [];
    try {
      for (const r of localToUtcRows(v.dia, v.ini, v.fin)) {
        const row = (await appointmentsApi.createSchedule(psychologistId, {
          diaSemana: r.dia_semana,
          horaInicio: r.hora_inicio,
          horaFin: r.hora_fin,
          modalidad: v.modalidad,
        })) as { id_horario: number };
        created.push(Number(row.id_horario));
      }
      return created;
    } catch (e) {
      for (const id of created)
        await appointmentsApi.deleteSchedule(id).catch(() => {});
      throw e;
    }
  };

  /* ---- Agregar ---- */
  const add = (v: Values) =>
    run("new", async () => {
      const twin = inactiveTwin(v, []);
      if (twin) {
        const clash = overlapWith(v, []);
        if (clash)
          throw new UserError(
            `Se superpone con un bloque activo (${describe(clash)}).`,
          );
        for (const id of twin.ids) await activate(id);
        return "Ya existía este bloque desactivado; se reactivó.";
      }
      const clash = overlapWith(v, []);
      if (clash)
        throw new UserError(
          `Se superpone con un bloque activo (${describe(clash)}).`,
        );
      await createRows(v);
      return "Bloque agregado.";
    });

  /* ---- Editar en el lugar (mismas filas, nuevos valores) ---- */
  const edit = (b: LocalBlock, v: Values) =>
    run(keyOf(b), async () => {
      const clash = overlapWith(v, b.ids);
      if (clash)
        throw new UserError(
          `Se superpone con un bloque activo (${describe(clash)}).`,
        );
      if (inactiveTwin(v, b.ids))
        throw new UserError(
          "Ya existe un bloque desactivado con ese horario. Reactívalo o elimínalo primero.",
        );

      const old = b.ids.map(rowOf);
      const want = localToUtcRows(v.dia, v.ini, v.fin);
      const n = Math.min(old.length, want.length);
      const created: number[] = [];

      try {
        // Un bloque partido en dos filas se libera antes para que sus filas no
        // se estorben entre sí al moverlas.
        if (old.length > 1)
          for (const r of old)
            await appointmentsApi.deactivateSchedule(Number(r.id_horario));
        for (let i = 0; i < n; i++)
          await appointmentsApi.updateSchedule(Number(old[i].id_horario), {
            activo: true,
            diaSemana: want[i].dia_semana,
            horaInicio: want[i].hora_inicio,
            horaFin: want[i].hora_fin,
            modalidad: v.modalidad,
          });
        for (let i = n; i < want.length; i++) {
          const row = (await appointmentsApi.createSchedule(psychologistId, {
            diaSemana: want[i].dia_semana,
            horaInicio: want[i].hora_inicio,
            horaFin: want[i].hora_fin,
            modalidad: v.modalidad,
          })) as { id_horario: number };
          created.push(Number(row.id_horario));
        }
      } catch (e) {
        for (const id of created)
          await appointmentsApi.deleteSchedule(id).catch(() => {});
        for (const r of old)
          await appointmentsApi
            .updateSchedule(Number(r.id_horario), fieldsOf(r))
            .catch(() => {});
        throw e;
      }
      // Sobran filas del bloque anterior (el nuevo necesita menos): se eliminan.
      for (let i = n; i < old.length; i++)
        await appointmentsApi
          .deleteSchedule(Number(old[i].id_horario))
          .catch(() => {});

      setEditingKey(null);
      return "Bloque actualizado.";
    });

  /* ---- Desactivar / reactivar / eliminar ---- */
  const deactivate = async (b: LocalBlock) => {
    const okc = await confirmAsync(
      "Desactivar bloque",
      "Dejará de ofrecerse para nuevas citas. Las citas ya agendadas no se modifican y podrás reactivarlo después.",
      "Desactivar",
      "Volver",
    );
    if (!okc) return;
    await run(keyOf(b), async () => {
      for (const id of b.ids) await appointmentsApi.deactivateSchedule(id);
      return "Bloque desactivado.";
    });
  };

  const reactivate = (b: LocalBlock) =>
    run(keyOf(b), async () => {
      const clash = overlapWith(
        {
          dia: b.dia_semana,
          ini: b.inicioMin,
          fin: b.finMin,
          modalidad: b.modalidad,
        },
        b.ids,
      );
      if (clash)
        throw new UserError(
          `No se puede reactivar: se superpone con un bloque activo (${describe(clash)}). Desactívalo o edítalo primero.`,
        );
      const done: number[] = [];
      try {
        for (const id of b.ids) {
          await activate(id);
          done.push(id);
        }
      } catch (e) {
        for (const id of done)
          await appointmentsApi.deactivateSchedule(id).catch(() => {});
        throw e;
      }
      return "Bloque reactivado.";
    });

  const remove = async (b: LocalBlock) => {
    const okc = await confirmAsync(
      "Eliminar bloque",
      `Se eliminará definitivamente ${describe(b)}. Esta acción no se puede deshacer. Las citas ya agendadas no se modifican.`,
      "Eliminar",
      "Volver",
    );
    if (!okc) return;
    await run(keyOf(b), async () => {
      for (const id of b.ids) await appointmentsApi.deleteSchedule(id);
      setEditingKey(null);
      return "Bloque eliminado.";
    });
  };

  const byDay = (blocks: LocalBlock[], d: number) =>
    blocks.filter((b) => b.dia_semana === d);
  const totalCitas = (b: LocalBlock) =>
    Math.floor((b.finMin - b.inicioMin) / duracionMin);

  return (
    <View className="gap-5">
      <Muted>
        Escribe tus bloques en tu hora local ({zonaDispositivo()}). Se guardan
        en UTC y cada paciente los ve en la hora de su dispositivo. Si tu país
        cambia de horario de verano, vuelve a guardar tus bloques.
      </Muted>

      {ok ? (
        <Text className="rounded-nf-sm bg-primary-light p-3 font-sans text-sm text-primary-dark">
          {ok}
        </Text>
      ) : null}

      <Card className="gap-3">
        <H2>Nuevo bloque</H2>
        <BlockForm
          busy={busyKey === "new"}
          error={failFor("new")}
          onSubmit={(v) => void add(v)}
        />
      </Card>

      <View className="gap-3">
        <H2>Bloques activos</H2>
        {active.length === 0 ? (
          <Muted>No tienes bloques activos: nadie puede agendar contigo.</Muted>
        ) : (
          DIAS.map((label, i) => {
            const list = byDay(active, i + 1);
            if (list.length === 0) return null;
            return (
              <Card key={label} className="gap-4">
                <Text className="font-sans font-semibold text-ink">
                  {label}
                </Text>
                {list.map((b) => {
                  const k = keyOf(b);
                  return editingKey === k ? (
                    <BlockForm
                      key={k}
                      initial={b}
                      busy={busyKey === k}
                      error={failFor(k)}
                      onSubmit={(v) => void edit(b, v)}
                      onCancel={() => {
                        setEditingKey(null);
                        setFail(null);
                      }}
                    />
                  ) : (
                    <View key={k} className="gap-2">
                      <Text className="font-sans text-[15px] text-ink">
                        {fmt(b.inicioMin)} – {fmt(b.finMin)} ·{" "}
                        {MODALIDAD[b.modalidad]}
                      </Text>
                      <Muted>
                        Hasta {totalCitas(b)} citas de {duracionMin} min
                      </Muted>
                      <ErrorText text={failFor(k)} />
                      <View className="flex-row flex-wrap gap-2">
                        <Button
                          title="Editar"
                          variant="secondary"
                          onPress={() => {
                            setEditingKey(k);
                            setFail(null);
                            setOk("");
                          }}
                        />
                        <Button
                          title="Desactivar"
                          variant="secondary"
                          loading={busyKey === k}
                          onPress={() => void deactivate(b)}
                        />
                        <Button
                          title="Eliminar"
                          variant="danger"
                          disabled={busyKey === k}
                          onPress={() => void remove(b)}
                        />
                      </View>
                    </View>
                  );
                })}
              </Card>
            );
          })
        )}
      </View>

      {inactive.length > 0 ? (
        <View className="gap-3">
          <H2>Bloques desactivados</H2>
          {inactive.map((b) => {
            const k = keyOf(b);
            return (
              <Card key={k} className="gap-2">
                <Text className="font-sans text-[15px] text-ink">
                  {describe(b)} · {MODALIDAD[b.modalidad]}
                </Text>
                <ErrorText text={failFor(k)} />
                <View className="flex-row flex-wrap gap-2">
                  <Button
                    title="Reactivar"
                    variant="secondary"
                    loading={busyKey === k}
                    onPress={() => void reactivate(b)}
                  />
                  <Button
                    title="Eliminar"
                    variant="danger"
                    disabled={busyKey === k}
                    onPress={() => void remove(b)}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
