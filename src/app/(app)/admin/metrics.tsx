import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, H2, Muted } from "@/components/ui/typography";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { Count, loadMetrics, Metrics, PeriodStats } from "@/lib/metrics";
import { ReactNode } from "react";
import { Text, View } from "react-native";

const n = (v: number) => v.toLocaleString("es-MX");
const dec = (v: number | null, suffix = "") =>
  v == null ? "—" : `${v.toLocaleString("es-MX")}${suffix}`;

/* ------------------------------------------------------------------ */
/* Piezas visuales                                                     */
/* ------------------------------------------------------------------ */
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-8 gap-4">
      <View>
        <H2>{title}</H2>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </View>
      {children}
    </View>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-3">{children}</View>;
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "warn" | "danger";
}) {
  return (
    <Card className="min-w-[150px] flex-1 gap-1 p-4">
      <Text
        className={cn(
          "font-serif text-3xl font-medium",
          tone === "danger"
            ? "text-danger"
            : tone === "warn"
              ? "text-warning"
              : "text-ink",
        )}
      >
        {typeof value === "number" ? n(value) : value}
      </Text>
      <Text className="font-sans text-sm text-ink">{label}</Text>
      {hint ? (
        <Text className="font-sans text-xs text-muted">{hint}</Text>
      ) : null}
    </Card>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="min-w-[280px] flex-1 gap-3">
      <Text className="font-sans text-sm font-semibold text-ink">{title}</Text>
      {children}
    </Card>
  );
}

function Bars({ items }: { items: Count[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View className="gap-2.5">
      {items.map((i) => (
        <View key={i.label} className="gap-1">
          <View className="flex-row justify-between gap-3">
            <Text className="flex-1 font-sans text-sm text-ink">{i.label}</Text>
            <Text className="font-sans text-sm font-semibold text-ink">
              {n(i.value)}
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-primary-light">
            <View
              className="h-2 rounded-full bg-primary"
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function Line({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="flex-1 font-sans text-sm text-muted">{label}</Text>
      <Text className="font-sans text-sm font-semibold text-ink">
        {typeof value === "number" ? n(value) : value}
      </Text>
    </View>
  );
}

function Period({ p }: { p: PeriodStats }) {
  return (
    <Card className="min-w-[240px] flex-1 gap-2 p-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-sans text-sm font-semibold text-ink">
          {p.label}
        </Text>
        <Text className="font-serif text-2xl text-ink">{n(p.total)}</Text>
      </View>
      <Line
        label="Programadas (solicitadas + confirmadas)"
        value={p.programadas}
      />
      <Line label="Realizadas" value={p.realizadas} />
      <Line label="Canceladas" value={p.canceladas} />
      <Line label="No asistió" value={p.noAsistio} />
      <Line label="Reprogramadas" value={p.reprogramadas} />
    </Card>
  );
}

function Badge({ text, ok }: { text: string; ok: boolean }) {
  return (
    <Text
      className={cn(
        "rounded-nf-sm px-2 py-0.5 font-sans text-xs",
        ok ? "bg-primary-light text-primary-dark" : "bg-border text-muted",
      )}
    >
      {text}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function MetricsScreen() {
  const q = useLoad<Metrics>(() => loadMetrics(), []);

  if (q.loading && !q.data) return <Loading />;

  const m = q.data;

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mb-5 flex-row flex-wrap items-start justify-between gap-3">
          <View className="flex-1">
            <H1>Métricas globales</H1>
            <Muted>
              Datos agregados de toda la plataforma
              {m ? ` · actualizado ${formatDateTime(m.generatedAt)}` : ""}.
            </Muted>
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

        {m && m.failedSources.length > 0 ? (
          <Text className="mb-5 font-sans text-sm text-warning">
            No se pudieron cargar algunas fuentes y sus cifras pueden estar
            incompletas: {m.failedSources.join(", ")}.
          </Text>
        ) : null}

        {m ? (
          <>
            {/* ---------------- Resumen ---------------- */}
            <Section title="Resumen general">
              <Grid>
                <Stat label="Usuarios" value={m.users.total} />
                <Stat label="Pacientes" value={m.patients.total} />
                <Stat label="Psicólogos" value={m.psychologists.total} />
                <Stat label="Citas registradas" value={m.appointments.total} />
                <Stat
                  label="Citas programadas vigentes"
                  value={m.appointments.vigentes}
                />
                <Stat label="Evaluaciones" value={m.evaluations.total} />
                <Stat
                  label="Alertas de pánico pendientes"
                  value={m.chat.alertas.pendientes}
                  tone={m.chat.alertas.pendientes > 0 ? "danger" : undefined}
                />
                <Stat
                  label="Sugerencias nuevas"
                  value={m.suggestions.sinAtender}
                  tone={m.suggestions.sinAtender > 0 ? "warn" : undefined}
                />
              </Grid>
            </Section>

            {/* ---------------- Citas ---------------- */}
            <Section
              title="Citas"
              subtitle="Por periodo según la fecha de inicio de la cita, en tu hora local. La semana va de lunes a domingo."
            >
              <Grid>
                {m.appointments.periodos.map((p) => (
                  <Period key={p.label} p={p} />
                ))}
              </Grid>
              <Grid>
                <Panel title="Por estado">
                  <Bars items={m.appointments.porEstado} />
                </Panel>
                <Panel title="Por modalidad">
                  <Bars items={m.appointments.porModalidad} />
                </Panel>
              </Grid>
              <Grid>
                <Panel title="Citas por mes (incluye el mes siguiente)">
                  <Bars items={m.appointments.porMes} />
                </Panel>
                <Panel title="Carga por día de la semana">
                  <Bars items={m.appointments.porDiaSemana} />
                </Panel>
              </Grid>
              <Grid>
                <Stat
                  label="Tasa de asistencia"
                  value={dec(m.appointments.tasaAsistencia, " %")}
                  hint="Realizadas / (realizadas + no asistió)"
                />
                <Stat
                  label="Tasa de cancelación"
                  value={dec(m.appointments.tasaCancelacion, " %")}
                  hint="Canceladas / total de citas"
                />
                <Stat
                  label="Anticipación promedio"
                  value={dec(m.appointments.anticipacionPromedioDias, " días")}
                  hint="Entre solicitar y la cita"
                />
                <Stat
                  label="Duración promedio"
                  value={dec(m.appointments.duracionPromedioMin, " min")}
                />
                <Stat
                  label="Citas originadas en una evaluación"
                  value={m.appointments.desdeEvaluacion}
                />
              </Grid>
            </Section>

            {/* ---------------- Pacientes ---------------- */}
            <Section title="Pacientes y cobertura">
              <Grid>
                <Stat
                  label="Activos"
                  value={m.patients.activos}
                  hint={`${n(m.patients.inactivos)} inactivos`}
                />
                <Stat
                  label="Con cita registrada"
                  value={m.patients.conCitas}
                  hint={`${n(m.patients.sinCitas)} sin ninguna cita`}
                />
                <Stat
                  label="Con cita programada"
                  value={m.patients.conCitaProgramada}
                />
                <Stat
                  label="Con psicólogo principal"
                  value={m.patients.conPsicologoPrincipal}
                />
                <Stat
                  label="Sin psicólogo principal"
                  value={m.patients.sinPsicologoPrincipal}
                  tone={
                    m.patients.sinPsicologoPrincipal > 0 ? "warn" : undefined
                  }
                />
                <Stat
                  label="Con evaluación"
                  value={m.patients.conEvaluacion}
                  hint={`${n(m.patients.sinEvaluacion)} sin evaluar`}
                />
                <Stat label="Con expediente" value={m.patients.conExpediente} />
                <Stat
                  label="Edad promedio"
                  value={dec(m.patients.edadPromedio, " años")}
                />
              </Grid>
              <Grid>
                <Panel title="Por tipo de persona">
                  <Bars items={m.patients.porTipo} />
                </Panel>
                <Panel title="Contacto preferido">
                  <Bars items={m.patients.porContacto} />
                </Panel>
                <Panel title="Rangos de edad">
                  <Bars items={m.patients.porEdad} />
                </Panel>
              </Grid>
            </Section>

            {/* ---------------- Psicólogos ---------------- */}
            <Section title="Psicólogos y asignaciones">
              <Grid>
                <Stat
                  label="Disponibles para citas"
                  value={m.psychologists.activosParaCitas}
                  hint={`de ${n(m.psychologists.total)}`}
                />
                <Stat
                  label="Con chat disponible"
                  value={m.psychologists.chatDisponible}
                />
                <Stat
                  label="Con citas registradas"
                  value={m.psychologists.conCitas}
                />
                <Stat
                  label="Con citas activas"
                  value={m.psychologists.conCitasProgramadas}
                  hint="Programadas que aún no terminan"
                />
                <Stat
                  label="Sin pacientes asignados"
                  value={m.psychologists.sinPacientes}
                />
                <Stat
                  label="Pacientes por psicólogo"
                  value={dec(m.psychologists.pacientesPorPsicologoPromedio)}
                  hint={
                    m.psychologists.mayorCarga
                      ? `Mayor carga: ${m.psychologists.mayorCarga.nombre} (${n(m.psychologists.mayorCarga.value)})`
                      : undefined
                  }
                />
                <Stat
                  label="Duración de cita (promedio)"
                  value={dec(m.psychologists.duracionPromedio, " min")}
                />
                <Stat
                  label="Asignaciones activas"
                  value={m.assignments.activas}
                  hint={`${n(m.assignments.principales)} principales · ${n(m.assignments.adicionales)} adicionales`}
                />
              </Grid>

              <Panel title="Por especialidad">
                <Bars items={m.psychologists.porEspecialidad} />
              </Panel>

              <View className="gap-3">
                <Text className="font-sans text-sm font-semibold text-ink">
                  Detalle por psicólogo
                </Text>
                {m.psychologists.filas.map((f) => (
                  <Card key={f.id} className="gap-2 p-4">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="font-sans font-semibold text-ink">
                        {f.nombre}
                      </Text>
                      <Badge
                        text={f.activoParaCitas ? "Recibe citas" : "Sin citas"}
                        ok={f.activoParaCitas}
                      />
                      <Badge
                        text={f.chatDisponible ? "Chat activo" : "Sin chat"}
                        ok={f.chatDisponible}
                      />
                    </View>
                    {f.especialidad ? <Muted>{f.especialidad}</Muted> : null}
                    <View className="flex-row flex-wrap gap-x-6 gap-y-1">
                      <Text className="font-sans text-sm text-ink">
                        Pacientes: {n(f.pacientes)} ({n(f.pacientesPrincipales)}{" "}
                        principales)
                      </Text>
                      <Text className="font-sans text-sm text-ink">
                        Citas: {n(f.citasTotal)} · activas{" "}
                        {n(f.citasProgramadas)}
                      </Text>
                      <Text className="font-sans text-sm text-ink">
                        Realizadas {n(f.realizadas)} · Canceladas{" "}
                        {n(f.canceladas)} · No asistió {n(f.noAsistio)}
                      </Text>
                      <Text className="font-sans text-sm text-ink">
                        Expedientes: {n(f.expedientes)}
                      </Text>
                      <Text
                        className={cn(
                          "font-sans text-sm",
                          f.evaluacionesPendientes > 0
                            ? "text-warning"
                            : "text-ink",
                        )}
                      >
                        Evaluaciones por revisar: {n(f.evaluacionesPendientes)}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            </Section>

            {/* ---------------- Evaluaciones ---------------- */}
            <Section
              title="Evaluaciones"
              subtitle="Resultados preventivos agregados; no son diagnósticos."
            >
              <Grid>
                <Stat
                  label="Pacientes con evaluación"
                  value={m.evaluations.pacientesConEvaluacion}
                />
                <Stat
                  label="Con alerta prioritaria"
                  value={m.evaluations.conAlertaPrioritaria}
                  tone={
                    m.evaluations.conAlertaPrioritaria > 0
                      ? "danger"
                      : undefined
                  }
                />
                <Stat
                  label="Pendientes de revisión"
                  value={m.evaluations.pendientesRevision}
                  tone={
                    m.evaluations.pendientesRevision > 0 ? "warn" : undefined
                  }
                />
                <Stat label="Revisadas" value={m.evaluations.revisadas} />
              </Grid>
              <Grid>
                <Panel title="Por estado">
                  <Bars items={m.evaluations.porEstado} />
                </Panel>
                <Panel title="Evaluaciones por mes">
                  <Bars items={m.evaluations.porMes} />
                </Panel>
              </Grid>
              <Grid>
                <Panel
                  title={`PSS-14 · ${n(m.evaluations.pss14.aplicadas)} aplicaciones`}
                >
                  <Line
                    label="Promedio (0 a 56)"
                    value={dec(m.evaluations.pss14.promedio)}
                  />
                  <Line
                    label="Mínimo"
                    value={dec(m.evaluations.pss14.minimo)}
                  />
                  <Line
                    label="Máximo"
                    value={dec(m.evaluations.pss14.maximo)}
                  />
                </Panel>
                <Panel
                  title={`GAD-7 · ${n(m.evaluations.gad7.aplicadas)} aplicaciones`}
                >
                  <Line
                    label="Promedio (0 a 21)"
                    value={dec(m.evaluations.gad7.promedio)}
                  />
                  <Bars items={m.evaluations.gad7.niveles} />
                </Panel>
                <Panel
                  title={`PHQ-9 · ${n(m.evaluations.phq9.aplicadas)} aplicaciones`}
                >
                  <Line
                    label="Promedio (0 a 27)"
                    value={dec(m.evaluations.phq9.promedio)}
                  />
                  <Bars items={m.evaluations.phq9.niveles} />
                </Panel>
              </Grid>
            </Section>

            {/* ---------------- Expedientes ---------------- */}
            <Section title="Expedientes">
              <Grid>
                <Stat
                  label="Expedientes con responsable"
                  value={m.records.total}
                />
                <Stat
                  label="Abiertos este mes"
                  value={m.records.abiertosEsteMes}
                />
              </Grid>
              <Grid>
                <Panel title="Por estado">
                  <Bars items={m.records.porEstado} />
                </Panel>
                <Panel title="Aperturas por mes">
                  <Bars items={m.records.porMes} />
                </Panel>
              </Grid>
            </Section>

            {/* ---------------- Chat y alertas ---------------- */}
            <Section title="Chat y alertas de pánico">
              <Grid>
                <Stat label="Canales" value={m.chat.canales} />
                <Stat
                  label="Habilitados"
                  value={m.chat.habilitados}
                  hint={`${n(m.chat.sinHabilitar)} abiertos sin habilitar`}
                />
                <Stat label="Cerrados" value={m.chat.cerrados} />
                <Stat
                  label="Con actividad en 7 días"
                  value={m.chat.activosUltimos7d}
                />
                <Stat label="Alertas totales" value={m.chat.alertas.total} />
                <Stat
                  label="Alertas pendientes"
                  value={m.chat.alertas.pendientes}
                  tone={m.chat.alertas.pendientes > 0 ? "danger" : undefined}
                  hint="Emitidas, notificadas o vistas"
                />
                <Stat
                  label="Alertas en 30 días"
                  value={m.chat.alertas.ultimos30d}
                />
                <Stat
                  label="Pacientes que activaron alertas"
                  value={m.chat.alertas.pacientesDistintos}
                />
                <Stat
                  label="Tiempo hasta ver la alerta"
                  value={dec(m.chat.alertas.minutosHastaVista, " min")}
                />
                <Stat
                  label="Tiempo hasta atenderla"
                  value={dec(m.chat.alertas.minutosHastaAtencion, " min")}
                />
              </Grid>
              <Panel title="Alertas por estado">
                <Bars items={m.chat.alertas.porEstado} />
              </Panel>
            </Section>

            {/* ---------------- Sugerencias ---------------- */}
            <Section title="Buzón de sugerencias">
              <Grid>
                <Stat label="Sugerencias" value={m.suggestions.total} />
                <Stat
                  label="Sin atender"
                  value={m.suggestions.sinAtender}
                  tone={m.suggestions.sinAtender > 0 ? "warn" : undefined}
                />
                <Stat label="Anónimas" value={m.suggestions.anonimas} />
                <Stat
                  label="Calificación promedio"
                  value={dec(m.suggestions.calificacionPromedio, " / 5")}
                />
                <Stat
                  label="Días promedio de atención"
                  value={dec(m.suggestions.diasPromedioAtencion)}
                />
              </Grid>
              <Grid>
                <Panel title="Por estado">
                  <Bars items={m.suggestions.porEstado} />
                </Panel>
                <Panel title="Por categoría">
                  <Bars items={m.suggestions.porCategoria} />
                </Panel>
              </Grid>
              {m.suggestions.porPsicologo.length > 0 ? (
                <Panel title="Psicólogos mencionados">
                  {m.suggestions.porPsicologo.map((p) => (
                    <Line
                      key={p.nombre}
                      label={p.nombre}
                      value={`${n(p.total)} · promedio ${dec(p.promedio)}`}
                    />
                  ))}
                </Panel>
              ) : null}
            </Section>

            {/* ---------------- Usuarios ---------------- */}
            <Section title="Usuarios y accesos">
              <Grid>
                <Stat
                  label="Cuentas activas"
                  value={m.users.activos}
                  hint={`${n(m.users.inactivos)} inactivas`}
                />
                <Stat label="Altas en 7 días" value={m.users.nuevos7d} />
                <Stat label="Altas en 30 días" value={m.users.nuevos30d} />
                <Stat label="Con acceso en 7 días" value={m.users.acceso7d} />
                <Stat label="Con acceso en 30 días" value={m.users.acceso30d} />
                <Stat
                  label="Nunca han ingresado"
                  value={m.users.nuncaIngresaron}
                />
              </Grid>
              <Grid>
                <Panel title="Por rol">
                  <Bars items={m.users.porRol} />
                </Panel>
                <Panel title="Registros por mes">
                  <Bars items={m.users.registrosPorMes} />
                </Panel>
              </Grid>
            </Section>

            {/* ---------------- Sistema ---------------- */}
            <Section title="Sistema">
              <Grid>
                <Stat
                  label="Servicio de cifrado"
                  value={
                    m.system.cifradoConfigurado == null
                      ? "—"
                      : m.system.cifradoConfigurado
                        ? "Configurado"
                        : "Sin configurar"
                  }
                  tone={
                    m.system.cifradoConfigurado === false ? "danger" : undefined
                  }
                  hint={
                    m.system.algoritmo
                      ? `${m.system.algoritmo} · versión de clave ${m.system.versionClave}`
                      : undefined
                  }
                />
              </Grid>
            </Section>
          </>
        ) : null}
      </Screen>
    </>
  );
}
