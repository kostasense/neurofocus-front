import { suggestionsApi } from "@/api/suggestions";
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
import { formatDateTime } from "@/lib/format";
import { Suggestion } from "@/types/api";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

/* ------------------------------------------------------------------ */
/* Catálogos                                                           */
/* ------------------------------------------------------------------ */
const ESTADO: Record<number, string> = {
  1: "Nueva",
  2: "En revisión",
  3: "Atendida",
  4: "Cerrada",
};
const CATEGORIA: Record<number, string> = {
  1: "Sistema",
  2: "Atención psicológica",
  3: "Citas",
  4: "Privacidad",
  5: "Otro",
};
/** Misma tabla de transiciones que valida el backend. */
const TRANSICIONES: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [3, 4],
  3: [4],
  4: [],
};
const MAX_RESPUESTA = 1000;
const COMENTARIO_CORTO = 220;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
};

const stars = (n: number | null) =>
  n == null ? "Sin calificación" : "★".repeat(n) + "☆".repeat(5 - n);

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

function StateBadge({ estado }: { estado: number }) {
  const tone =
    estado === 1
      ? "bg-warning/15 text-warning"
      : estado === 2
        ? "bg-primary-light text-primary-dark"
        : estado === 3
          ? "bg-success/15 text-success"
          : "bg-border text-muted";
  return (
    <Text className={cn("rounded-nf-sm px-2 py-0.5 font-sans text-xs", tone)}>
      {ESTADO[estado]}
    </Text>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <View className="min-w-[120px] flex-1 rounded-nf-sm border border-border bg-surface p-3">
      <Text className="font-serif text-2xl text-ink">{value}</Text>
      <Text className="font-sans text-xs text-ink">{label}</Text>
      {hint ? (
        <Text className="font-sans text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Formulario de atención                                              */
/* ------------------------------------------------------------------ */
function ManageForm({ s, onSaved }: { s: Suggestion; onSaved: () => void }) {
  const permitidos = [s.estado, ...(TRANSICIONES[s.estado] ?? [])];
  const [estado, setEstado] = useState<number>(s.estado);
  const [nota, setNota] = useState(s.respuesta_interna ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cambioEstado = estado !== s.estado;
  const cambioNota = nota.trim() !== (s.respuesta_interna ?? "").trim();

  const save = async () => {
    setError("");
    setOk("");
    if (!cambioEstado && !cambioNota)
      return setError("No hay cambios que guardar.");
    if (cambioNota && !nota.trim())
      return setError(
        "La respuesta interna no puede quedar vacía una vez registrada.",
      );

    const dto: Record<string, unknown> = {};
    if (cambioEstado) dto.estado = estado;
    if (cambioNota) dto.respuestaInterna = nota.trim();

    setBusy(true);
    try {
      await suggestionsApi.update(Number(s.id_sugerencia), dto);
      setOk("Cambios guardados.");
      onSaved();
    } catch (e) {
      setError(errMsg(e, "No se pudo actualizar la sugerencia"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-3 rounded-nf-sm border border-border p-3">
      <Text className="font-sans text-sm font-semibold text-ink">
        Atender sugerencia
      </Text>

      <View className="gap-1.5">
        <Text className="font-sans text-sm font-medium text-ink">Estado</Text>
        <Choice
          value={estado}
          onChange={setEstado}
          options={permitidos.map((v) => ({ value: v, label: ESTADO[v] }))}
        />
        {s.estado === 4 ? (
          <Muted>
            La sugerencia está cerrada: ya no puede cambiar de estado, pero sí
            puedes ajustar la nota interna.
          </Muted>
        ) : (
          <Muted>
            El estado solo avanza (nueva → en revisión → atendida → cerrada). Al
            pasar a atendida o cerrada se registra la fecha de atención.
          </Muted>
        )}
      </View>

      <View className="gap-1">
        <Input
          label="Respuesta o nota interna"
          value={nota}
          onChangeText={setNota}
          multiline
          maxLength={MAX_RESPUESTA}
          placeholder="Acciones tomadas, área a la que se canalizó, etc."
          style={{ minHeight: 96, textAlignVertical: "top", paddingTop: 10 }}
        />
        <Text className="text-right font-sans text-xs text-muted">
          {nota.length}/{MAX_RESPUESTA} · solo visible para administración
        </Text>
      </View>

      {error ? (
        <Text className="font-sans text-sm text-danger">{error}</Text>
      ) : null}
      {ok ? <Text className="font-sans text-sm text-success">{ok}</Text> : null}

      <Button title="Guardar" loading={busy} onPress={() => void save()} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta                                                             */
/* ------------------------------------------------------------------ */
function SuggestionCard({
  s,
  open,
  onToggle,
  onSaved,
}: {
  s: Suggestion;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [full, setFull] = useState(false);
  const anonima = s.id_autor == null;
  const largo = s.comentario.length > COMENTARIO_CORTO;
  const texto =
    largo && !full
      ? `${s.comentario.slice(0, COMENTARIO_CORTO)}…`
      : s.comentario;

  return (
    <Card className="gap-3">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="font-sans font-semibold text-ink">
            {CATEGORIA[s.categoria]}
          </Text>
          <StateBadge estado={s.estado} />
        </View>
        <Text className="font-sans text-xs text-muted">
          #{String(s.id_sugerencia)} · {formatDateTime(s.fecha_creacion)}
        </Text>
      </View>

      <Text className="font-sans text-[15px] leading-6 text-ink">{texto}</Text>
      {largo ? (
        <Pressable
          onPress={() => setFull((v) => !v)}
          accessibilityRole="button"
        >
          <Text className="font-sans text-sm text-primary">
            {full ? "Ver menos" : "Ver completa"}
          </Text>
        </Pressable>
      ) : null}

      <View className="gap-0.5">
        <Muted>
          Autor: {anonima ? "Anónima" : (s.autor ?? `Usuario ${s.id_autor}`)}
        </Muted>
        <Muted>Calificación: {stars(s.calificacion)}</Muted>
        {s.psicologo_referido ? (
          <Muted>Psicólogo referido: {s.psicologo_referido}</Muted>
        ) : null}
        {/* En sugerencias anónimas no se muestra la cita para no identificar al autor. */}
        {s.id_cita != null && !anonima ? (
          <Muted>Cita relacionada: #{String(s.id_cita)}</Muted>
        ) : null}
      </View>

      {s.fecha_atencion || s.administrador || s.respuesta_interna ? (
        <View className="gap-0.5 rounded-nf-sm bg-primary-light p-3">
          <Text className="font-sans text-xs font-semibold text-primary-dark">
            Seguimiento interno
          </Text>
          {s.administrador ? (
            <Text className="font-sans text-sm text-ink">
              Última gestión: {s.administrador}
            </Text>
          ) : null}
          {s.fecha_atencion ? (
            <Text className="font-sans text-sm text-ink">
              Atendida el {formatDateTime(s.fecha_atencion)}
            </Text>
          ) : null}
          {s.respuesta_interna ? (
            <Text className="font-sans text-sm text-ink">
              {s.respuesta_interna}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Button
        title={open ? "Cerrar" : s.estado === 4 ? "Editar nota" : "Atender"}
        variant="secondary"
        onPress={onToggle}
      />
      {open ? <ManageForm s={s} onSaved={onSaved} /> : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
type Autoria = "todas" | "identificadas" | "anonimas";

export default function Suggestions() {
  const q = useLoad<Suggestion[]>(() => suggestionsApi.list());
  const [estado, setEstado] = useState<number>(0); // 0 = todos
  const [categoria, setCategoria] = useState<number>(0);
  const [psicologo, setPsicologo] = useState<number>(0);
  const [autoria, setAutoria] = useState<Autoria>("todas");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const all = q.data ?? [];

  const resumen = useMemo(() => {
    const calif = all
      .map((s) => s.calificacion)
      .filter((c): c is number => c != null);
    const atendidas = all.filter((s) => s.fecha_atencion);
    const dias = atendidas.map(
      (s) =>
        (new Date(s.fecha_atencion as string).getTime() -
          new Date(s.fecha_creacion).getTime()) /
        86_400_000,
    );
    const prom = (v: number[]) =>
      v.length
        ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
        : null;
    return {
      porEstado: Object.keys(ESTADO).map((k) => ({
        k: Number(k),
        n: all.filter((s) => s.estado === Number(k)).length,
      })),
      calif: prom(calif),
      dias: prom(dias),
      anonimas: all.filter((s) => s.id_autor == null).length,
    };
  }, [all]);

  const psicologos = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of all)
      if (s.id_psicologo_referido != null && s.psicologo_referido)
        m.set(s.id_psicologo_referido, s.psicologo_referido);
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [all]);

  if (q.loading && !q.data) return <Loading />;

  const term = norm(search.trim());
  const items = all.filter((s) => {
    if (estado && s.estado !== estado) return false;
    if (categoria && s.categoria !== categoria) return false;
    if (psicologo && s.id_psicologo_referido !== psicologo) return false;
    if (autoria === "anonimas" && s.id_autor != null) return false;
    if (autoria === "identificadas" && s.id_autor == null) return false;
    if (!term) return true;
    return norm(
      `${s.comentario} ${s.autor ?? ""} ${s.psicologo_referido ?? ""} ${s.respuesta_interna ?? ""} ${s.administrador ?? ""}`,
    ).includes(term);
  });

  const filtrando =
    estado || categoria || psicologo || autoria !== "todas" || term;

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mb-5 flex-row flex-wrap items-start justify-between gap-3">
          <View className="flex-1">
            <H1>Buzón de sugerencias</H1>
            <Muted>Revisión y seguimiento institucional.</Muted>
          </View>
          <Button
            title="Actualizar"
            variant="secondary"
            loading={q.loading}
            onPress={() => void q.reload()}
          />
        </View>

        {q.error ? (
          <Text className="mb-4 font-sans text-sm text-danger">{q.error}</Text>
        ) : null}

        <View className="mb-6 flex-row flex-wrap gap-3">
          <Stat label="Total" value={all.length} />
          {resumen.porEstado.map((e) => (
            <Stat key={e.k} label={ESTADO[e.k]} value={e.n} />
          ))}
          <Stat
            label="Calificación promedio"
            value={resumen.calif == null ? "—" : `${resumen.calif} / 5`}
          />
          <Stat
            label="Días promedio de atención"
            value={resumen.dias == null ? "—" : resumen.dias}
          />
          <Stat label="Anónimas" value={resumen.anonimas} />
        </View>

        <View className="mb-5 gap-3">
          <Input
            placeholder="Buscar en comentarios, autor, psicólogo o notas"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          <Choice
            value={estado}
            onChange={setEstado}
            options={[
              { value: 0, label: "Todos los estados" },
              ...resumen.porEstado.map((e) => ({
                value: e.k,
                label: `${ESTADO[e.k]} (${e.n})`,
              })),
            ]}
          />
          <Choice
            value={categoria}
            onChange={setCategoria}
            options={[
              { value: 0, label: "Todas las categorías" },
              ...Object.entries(CATEGORIA).map(([k, label]) => ({
                value: Number(k),
                label,
              })),
            ]}
          />
          <Choice<Autoria>
            value={autoria}
            onChange={setAutoria}
            options={[
              { value: "todas", label: "Todas" },
              { value: "identificadas", label: "Identificadas" },
              { value: "anonimas", label: "Anónimas" },
            ]}
          />
          {psicologos.length > 0 ? (
            <Choice
              value={psicologo}
              onChange={setPsicologo}
              options={[
                { value: 0, label: "Cualquier psicólogo" },
                ...psicologos.map(([id, nombre]) => ({
                  value: id,
                  label: nombre,
                })),
              ]}
            />
          ) : null}
          {filtrando ? (
            <Button
              title="Limpiar filtros"
              variant="secondary"
              onPress={() => {
                setEstado(0);
                setCategoria(0);
                setPsicologo(0);
                setAutoria("todas");
                setSearch("");
              }}
            />
          ) : null}
        </View>

        <Muted className="mb-3">
          {items.length} de {all.length} sugerencias
        </Muted>

        {items.length === 0 ? (
          <EmptyState
            message={
              all.length
                ? "Ninguna sugerencia coincide con los filtros."
                : "Aún no hay sugerencias en el buzón."
            }
          />
        ) : (
          <View className="gap-3">
            {items.map((s) => {
              const id = String(s.id_sugerencia);
              return (
                <SuggestionCard
                  key={id}
                  s={s}
                  open={openId === id}
                  onToggle={() => setOpenId((cur) => (cur === id ? null : id))}
                  onSaved={() => void q.reload()}
                />
              );
            })}
          </View>
        )}
      </Screen>
    </>
  );
}
