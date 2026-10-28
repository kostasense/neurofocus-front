import { assignmentsApi } from "@/api/assignments";
import { patientsApi } from "@/api/patients";
import { psychologistsApi } from "@/api/psychologists";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chips } from "@/components/ui/chips";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { H1, H2, Muted } from "@/components/ui/typography";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { errMsg } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import {
  Assignment,
  PatientListItem,
  Psychologist,
  PsychologistPatient,
} from "@/types/api";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

const TIPOS_PERSONA: Record<string, string> = {
  A: "Alumno",
  D: "Docente",
  PA: "Personal administrativo",
};

const SI_NO = [
  { value: true, label: "Sí" },
  { value: false, label: "No" },
];

type ActiveAssignment = PsychologistPatient & {
  id_psicologo: number;
  psicologo: string;
};

type Data = {
  patients: PatientListItem[];
  psychologists: Psychologist[];
  active: ActiveAssignment[];
};

type Panel = {
  patientId: number;
  mode: "assign" | "close" | "history";
  assignment?: ActiveAssignment;
} | null;

/** Búsqueda sin distinguir mayúsculas ni acentos. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/* ------------------------------------------------------------------ */
/* Asignar / reasignar                                                 */
/* ------------------------------------------------------------------ */
function AssignForm({
  patient,
  psychologists,
  patientAssignments,
  onDone,
  onCancel,
}: {
  patient: PatientListItem;
  psychologists: Psychologist[];
  patientAssignments: ActiveAssignment[];
  onDone: (psicologo: string) => void;
  onCancel: () => void;
}) {
  const [idPsicologo, setIdPsicologo] = useState(0);
  const [esPrincipal, setEsPrincipal] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // El backend rechaza una segunda asignación activa con el mismo psicólogo.
  const candidatos = psychologists.filter(
    (ps) => !patientAssignments.some((a) => a.id_psicologo === ps.id_psicologo),
  );
  const principalActual = patientAssignments.find((a) => a.es_principal);
  const elegido = candidatos.find((ps) => ps.id_psicologo === idPsicologo);

  const submit = async () => {
    if (!elegido) return setError("Selecciona un psicólogo.");
    try {
      setSaving(true);
      setError("");
      await assignmentsApi.create({
        idPaciente: patient.id_paciente,
        idPsicologo: elegido.id_psicologo,
        esPrincipal,
      });
      onDone(elegido.nombre);
    } catch (e: any) {
      setError(errMsg(e, "No fue posible crear la asignación."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="mt-1 gap-4 border-t border-border pt-4">
      <Text className="font-sans text-sm font-semibold text-ink">
        {principalActual ? "Reasignar paciente" : "Asignar psicólogo"}
      </Text>

      {candidatos.length === 0 ? (
        <Muted>
          No hay más psicólogos disponibles: el paciente ya está asignado a
          todos.
        </Muted>
      ) : (
        <>
          <Field label="Psicólogo">
            <Chips
              options={candidatos.map((ps) => ({
                value: ps.id_psicologo,
                label: ps.activo_para_citas
                  ? ps.nombre
                  : `${ps.nombre} (sin citas)`,
              }))}
              value={idPsicologo}
              onChange={setIdPsicologo}
            />
          </Field>
          {elegido?.especialidad ? (
            <Muted>Especialidad: {elegido.especialidad}</Muted>
          ) : null}

          <Field label="Responsable principal">
            <Chips
              options={SI_NO}
              value={esPrincipal}
              onChange={setEsPrincipal}
            />
          </Field>

          {esPrincipal && principalActual ? (
            <Text className="font-sans text-sm text-warning">
              Se cerrará la asignación principal actual con{" "}
              {principalActual.psicologo} y el expediente activo pasará al nuevo
              psicólogo.
            </Text>
          ) : null}
        </>
      )}

      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <View className="flex-row gap-2">
        {candidatos.length > 0 && (
          <Button
            title="Confirmar asignación"
            loading={saving}
            onPress={() => void submit()}
          />
        )}
        <Button title="Cancelar" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Cerrar asignación                                                   */
/* ------------------------------------------------------------------ */
function CloseForm({
  assignment,
  onDone,
  onCancel,
}: {
  assignment: ActiveAssignment;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    try {
      setSaving(true);
      setError("");
      const payload: Record<string, unknown> = {};
      if (motivo.trim()) payload.motivoFin = motivo.trim();
      await assignmentsApi.close(Number(assignment.id_asignacion), payload);
      onDone();
    } catch (e: any) {
      setError(errMsg(e, "No fue posible cerrar la asignación."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="mt-1 gap-4 border-t border-border pt-4">
      <Text className="font-sans text-sm font-semibold text-ink">
        Cerrar asignación con {assignment.psicologo}
      </Text>
      {assignment.es_principal ? (
        <Text className="font-sans text-sm text-warning">
          Es la asignación principal: el expediente quedará sin psicólogo
          responsable hasta que se asigne uno nuevo.
        </Text>
      ) : null}
      <Input
        label="Motivo (opcional)"
        value={motivo}
        onChangeText={setMotivo}
        maxLength={250}
        placeholder="Ej. Cambio de horario del paciente"
      />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <View className="flex-row gap-2">
        <Button
          title="Cerrar asignación"
          variant="danger"
          loading={saving}
          onPress={() => void submit()}
        />
        <Button title="Cancelar" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Historial                                                           */
/* ------------------------------------------------------------------ */
function History({
  patientId,
  onClose,
}: {
  patientId: number;
  onClose: () => void;
}) {
  const h = useLoad<Assignment[]>(
    () => assignmentsApi.history(patientId) as Promise<Assignment[]>,
    [patientId],
  );

  return (
    <View className="mt-1 gap-3 border-t border-border pt-4">
      <Text className="font-sans text-sm font-semibold text-ink">
        Historial de asignaciones
      </Text>
      {h.loading ? <Muted>Cargando historial…</Muted> : null}
      {h.error ? <Text className="text-sm text-danger">{h.error}</Text> : null}
      {!h.loading && !h.error && (h.data ?? []).length === 0 ? (
        <Muted>Este paciente no tiene asignaciones registradas.</Muted>
      ) : null}
      {(h.data ?? []).map((a) => (
        <View
          key={String(a.id_asignacion)}
          className="gap-0.5 rounded-nf-sm border border-border px-3 py-2"
        >
          <Text className="font-sans text-sm font-semibold text-ink">
            {a.psicologo} · {a.es_principal ? "Principal" : "Adicional"}
          </Text>
          <Text className="font-sans text-xs text-muted">
            {formatDateTime(a.fecha_inicio)} →{" "}
            {a.fecha_fin ? formatDateTime(a.fecha_fin) : "vigente"}
          </Text>
          {a.motivo_fin ? (
            <Text className="font-sans text-xs text-muted">
              Motivo: {a.motivo_fin}
            </Text>
          ) : null}
        </View>
      ))}
      <View className="flex-row">
        <Button
          title="Cerrar historial"
          variant="secondary"
          onPress={onClose}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Assignments() {
  const [filtro, setFiltro] = useState<0 | 1 | 2>(0); // 0 todos, 1 sin principal, 2 con principal
  const [busqueda, setBusqueda] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // El backend no tiene un listado global de asignaciones: se arma con los
  // pacientes de cada psicólogo (pocas peticiones, una por psicólogo).
  const q = useLoad<Data>(async () => {
    const [patients, psychologists] = await Promise.all([
      patientsApi.list() as Promise<PatientListItem[]>,
      psychologistsApi.list(false),
    ]);
    const porPsicologo = await Promise.all(
      psychologists.map(async (ps) => {
        const rows = (await assignmentsApi.patients(
          ps.id_psicologo,
        )) as PsychologistPatient[];
        return rows.map((r) => ({
          ...r,
          id_psicologo: ps.id_psicologo,
          psicologo: ps.nombre,
        }));
      }),
    );
    return { patients, psychologists, active: porPsicologo.flat() };
  }, []);

  const byPatient = useMemo(() => {
    const m = new Map<number, ActiveAssignment[]>();
    for (const a of q.data?.active ?? []) {
      const list = m.get(a.id_paciente) ?? [];
      list.push(a);
      m.set(a.id_paciente, list);
    }
    return m;
  }, [q.data]);

  const sinPrincipal = useMemo(
    () =>
      (q.data?.patients ?? []).filter(
        (p) => !byPatient.get(p.id_paciente)?.some((a) => a.es_principal),
      ).length,
    [q.data, byPatient],
  );

  const visibles = useMemo(() => {
    const term = norm(busqueda.trim());
    return (q.data?.patients ?? []).filter((p) => {
      const tienePrincipal = !!byPatient
        .get(p.id_paciente)
        ?.some((a) => a.es_principal);
      if (filtro === 1 && tienePrincipal) return false;
      if (filtro === 2 && !tienePrincipal) return false;
      if (!term) return true;
      return norm(
        `${p.nombre} ${p.correo} ${p.num_control_o_num_empleado ?? ""}`,
      ).includes(term);
    });
  }, [q.data, byPatient, filtro, busqueda]);

  // Solo muestra la pantalla de carga la primera vez, para no perder los formularios.
  if (q.loading && !q.data) return <Loading />;

  const open = (
    patientId: number,
    mode: "assign" | "close" | "history",
    assignment?: ActiveAssignment,
  ) => {
    setNotice(null);
    setPanel({ patientId, mode, assignment });
  };

  const done = async (text: string) => {
    setPanel(null);
    setNotice({ ok: true, text });
    await q.reload();
  };

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mb-5">
          <H1>Asignaciones</H1>
          <Muted>
            Administra altas y cierres de relaciones paciente-psicólogo.
          </Muted>
        </View>

        <Card className="mb-5 flex-row flex-wrap gap-6">
          <View>
            <H2>{q.data?.patients.length ?? 0}</H2>
            <Muted>Pacientes</Muted>
          </View>
          <View>
            <H2>{(q.data?.patients.length ?? 0) - sinPrincipal}</H2>
            <Muted>Con psicólogo principal</Muted>
          </View>
          <View>
            <H2>{sinPrincipal}</H2>
            <Muted>Sin psicólogo principal</Muted>
          </View>
        </Card>

        <View className="mb-4 gap-3">
          <Input
            placeholder="Buscar por nombre, correo o número de control"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Chips
            options={[
              { value: 0 as 0 | 1 | 2, label: "Todos" },
              { value: 1 as 0 | 1 | 2, label: "Sin psicólogo" },
              { value: 2 as 0 | 1 | 2, label: "Con psicólogo" },
            ]}
            value={filtro}
            onChange={setFiltro}
          />
        </View>

        {notice ? (
          <Text
            className={cn(
              "mb-4 font-sans text-sm",
              notice.ok ? "text-primary" : "text-danger",
            )}
          >
            {notice.text}
          </Text>
        ) : null}
        {q.error ? (
          <Text className="mb-4 font-sans text-sm text-danger">{q.error}</Text>
        ) : null}

        <SimpleList
          items={visibles}
          keyOf={(p) => p.id_paciente}
          renderTitle={(p) => p.nombre}
          renderSubtitle={(p) =>
            `${p.num_control_o_num_empleado ?? "Sin identificador"} · ${
              TIPOS_PERSONA[p.tipo_persona] ?? p.tipo_persona
            } · ${p.correo}${p.activo ? "" : " · Cuenta inactiva"}`
          }
          action={(p) => {
            const asignaciones = byPatient.get(p.id_paciente) ?? [];
            const tienePrincipal = asignaciones.some((a) => a.es_principal);
            const abierto = panel?.patientId === p.id_paciente ? panel : null;

            return (
              <View className="mt-3 gap-3">
                {asignaciones.length === 0 ? (
                  <Text className="font-sans text-sm text-warning">
                    Sin psicólogo asignado
                  </Text>
                ) : (
                  asignaciones.map((a) => (
                    <View
                      key={String(a.id_asignacion)}
                      className="flex-row flex-wrap items-center justify-between gap-2 rounded-nf-sm bg-primary-light px-3 py-2"
                    >
                      <View className="flex-1">
                        <Text className="font-sans text-sm font-semibold text-ink">
                          {a.psicologo}
                        </Text>
                        <Text className="font-sans text-xs text-muted">
                          {a.es_principal ? "Principal" : "Adicional"} · desde{" "}
                          {formatDateTime(a.fecha_inicio)}
                        </Text>
                      </View>
                      {!abierto && (
                        <Button
                          title="Cerrar"
                          variant="secondary"
                          onPress={() => open(p.id_paciente, "close", a)}
                        />
                      )}
                    </View>
                  ))
                )}

                {!abierto && (
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      title={tienePrincipal ? "Reasignar" : "Asignar psicólogo"}
                      disabled={!p.activo}
                      onPress={() => open(p.id_paciente, "assign")}
                    />
                    <Button
                      title="Historial"
                      variant="secondary"
                      onPress={() => open(p.id_paciente, "history")}
                    />
                  </View>
                )}

                {abierto?.mode === "assign" && (
                  <AssignForm
                    patient={p}
                    psychologists={q.data?.psychologists ?? []}
                    patientAssignments={asignaciones}
                    onCancel={() => setPanel(null)}
                    onDone={(psicologo) =>
                      void done(`${p.nombre} asignado a ${psicologo}.`)
                    }
                  />
                )}
                {abierto?.mode === "close" && abierto.assignment && (
                  <CloseForm
                    assignment={abierto.assignment}
                    onCancel={() => setPanel(null)}
                    onDone={() =>
                      void done(
                        `Asignación de ${p.nombre} con ${abierto.assignment?.psicologo} cerrada.`,
                      )
                    }
                  />
                )}
                {abierto?.mode === "history" && (
                  <History
                    patientId={p.id_paciente}
                    onClose={() => setPanel(null)}
                  />
                )}
              </View>
            );
          }}
        />
      </Screen>
    </>
  );
}
