import { patientsApi } from "@/api/patients";
import { psychologistsApi } from "@/api/psychologists";
import { usersApi } from "@/api/users";
import { SimpleList } from "@/components/data/simple-list";
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
import { Role, User } from "@/types/api";
import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

const ROLES: Record<number, string> = {
  1: "Paciente",
  2: "Psicólogo",
  3: "Administrador",
};

const TIPOS_PERSONA = [
  { value: "A", label: "Alumno" },
  { value: "D", label: "Docente" },
  { value: "PA", label: "Personal administrativo" },
];

const CONTACTO = [
  { value: 0, label: "Sin definir" },
  { value: 1, label: "Correo" },
  { value: 2, label: "Teléfono" },
  { value: 3, label: "Notificación" },
];

const SI_NO = [
  { value: true, label: "Sí" },
  { value: false, label: "No" },
];

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_TELEFONO = /^\+?[0-9]{10,15}$/;

/** Los errores de class-validator llegan como arreglo de mensajes. */
function errMsg(e: any, fallback: string): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(". ");
  return m ?? fallback;
}

function Chips<T extends string | number | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            className={cn(
              "rounded-nf-sm border px-3 py-2",
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans text-sm font-medium text-ink">{label}</Text>
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Crear usuario                                                       */
/* ------------------------------------------------------------------ */
function CreateUserForm({
  onCreated,
  onCancel,
}: {
  onCreated: (u: User) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState({
    correo: "",
    nombre: "",
    contrasena: "",
    idRol: 1 as Role,
    numControlOEmpleado: "",
    tipoPersona: "A",
    cedulaProfesional: "",
    especialidad: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const set =
    <K extends keyof typeof d>(k: K) =>
    (v: (typeof d)[K]) =>
      setD((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const correo = d.correo.trim();
    const nombre = d.nombre.trim();
    if (!nombre) return setError("Escribe el nombre.");
    if (!correo.includes("@")) return setError("Escribe un correo válido.");
    if (d.contrasena.length < 8)
      return setError("La contraseña debe tener al menos 8 caracteres.");
    if (d.idRol === 1 && !d.numControlOEmpleado.trim())
      return setError("El número de control o empleado es obligatorio.");
    if (d.idRol === 2 && !d.cedulaProfesional.trim())
      return setError("La cédula profesional es obligatoria.");

    const payload: Record<string, unknown> = {
      correo,
      nombre,
      contrasena: d.contrasena,
      idRol: d.idRol,
    };
    if (d.idRol === 1) {
      payload.numControlOEmpleado = d.numControlOEmpleado.trim();
      payload.tipoPersona = d.tipoPersona;
    }
    if (d.idRol === 2) {
      payload.cedulaProfesional = d.cedulaProfesional.trim();
      if (d.especialidad.trim()) payload.especialidad = d.especialidad.trim();
    }

    try {
      setSaving(true);
      setError("");
      const created = await usersApi.create(payload);
      onCreated(created as User);
    } catch (e: any) {
      setError(errMsg(e, "No fue posible crear el usuario."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-5 gap-4">
      <H2>Nuevo usuario</H2>
      <Field label="Rol">
        <Chips
          options={[
            { value: 1 as Role, label: "Paciente" },
            { value: 2 as Role, label: "Psicólogo" },
            { value: 3 as Role, label: "Administrador" },
          ]}
          value={d.idRol}
          onChange={set("idRol")}
        />
      </Field>
      <Input label="Nombre" value={d.nombre} onChangeText={set("nombre")} />
      <Input
        label="Correo"
        autoCapitalize="none"
        keyboardType="email-address"
        value={d.correo}
        onChangeText={set("correo")}
      />
      <View>
        <Input
          label="Contraseña"
          value={d.contrasena}
          onChangeText={set("contrasena")}
          secureTextEntry={!mostrarContrasena}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => setMostrarContrasena((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"
          }
          className="absolute bottom-0 right-0 h-12 w-12 items-center justify-center"
        >
          <Ionicons
            name={mostrarContrasena ? "eye-off-outline" : "eye-outline"}
            size={22}
            color="#6b7280"
          />
        </Pressable>
      </View>

      {d.idRol === 1 && (
        <>
          <Input
            label="Número de control o empleado"
            value={d.numControlOEmpleado}
            onChangeText={set("numControlOEmpleado")}
          />
          <Field label="Tipo de persona">
            <Chips
              options={TIPOS_PERSONA}
              value={d.tipoPersona}
              onChange={set("tipoPersona")}
            />
          </Field>
        </>
      )}

      {d.idRol === 2 && (
        <>
          <Input
            label="Cédula profesional"
            value={d.cedulaProfesional}
            onChangeText={set("cedulaProfesional")}
          />
          <Input
            label="Especialidad (opcional)"
            value={d.especialidad}
            onChangeText={set("especialidad")}
          />
        </>
      )}

      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <View className="flex-row gap-2">
        <Button
          title="Crear usuario"
          loading={saving}
          onPress={() => void submit()}
        />
        <Button title="Cancelar" variant="secondary" onPress={onCancel} />
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Editar usuario                                                      */
/* ------------------------------------------------------------------ */
function EditUserForm({
  user,
  onSaved,
  onCancel,
}: {
  user: User;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [base, setBase] = useState({
    correo: user.correo,
    nombre: user.nombre,
  });
  const [pat, setPat] = useState({
    numControlOEmpleado: "",
    tipoPersona: "A",
    fechaNacimiento: "",
    telefono: "",
    telefonoConfianza: "",
    contactoPreferido: 0,
  });
  const [psy, setPsy] = useState({
    cedulaProfesional: "",
    especialidad: "",
    duracionCitaMinutos: "50",
    chatDisponible: false,
    activoParaCitas: true,
  });
  const [loadingDetail, setLoadingDetail] = useState(user.id_rol !== 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Carga los datos propios del rol (paciente o psicólogo).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (user.id_rol === 1) {
          const p: any = await patientsApi.get(user.id_usuario);
          if (!alive) return;
          setPat({
            numControlOEmpleado: p.numControlOEmpleado ?? "",
            tipoPersona: p.tipoPersona ?? "A",
            fechaNacimiento: p.fechaNacimiento
              ? String(p.fechaNacimiento).slice(0, 10)
              : "",
            telefono: p.telefono ?? "",
            telefonoConfianza: p.telefonoConfianza ?? "",
            contactoPreferido: p.contactoPreferido ?? 0,
          });
        } else if (user.id_rol === 2) {
          const p: any = await psychologistsApi.get(user.id_usuario);
          if (!alive) return;
          setPsy({
            cedulaProfesional: p.cedula_profesional ?? "",
            especialidad: p.especialidad ?? "",
            duracionCitaMinutos: String(p.duracion_cita_minutos ?? 50),
            chatDisponible: !!p.chat_disponible,
            activoParaCitas: !!p.activo_para_citas,
          });
        }
      } catch (e: any) {
        if (alive) setError(errMsg(e, "No se pudieron cargar los datos."));
      } finally {
        if (alive) setLoadingDetail(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user.id_usuario, user.id_rol]);

  const submit = async () => {
    const correo = base.correo.trim();
    const nombre = base.nombre.trim();
    if (!nombre) return setError("El nombre no puede estar vacío.");
    if (!correo.includes("@")) return setError("Escribe un correo válido.");

    let patientPayload: Record<string, unknown> | null = null;
    let psychologistPayload: Record<string, unknown> | null = null;

    if (user.id_rol === 1) {
      if (!pat.numControlOEmpleado.trim())
        return setError("El número de control o empleado es obligatorio.");
      if (pat.fechaNacimiento && !RE_FECHA.test(pat.fechaNacimiento))
        return setError("La fecha debe tener el formato AAAA-MM-DD.");
      if (pat.telefono && !RE_TELEFONO.test(pat.telefono))
        return setError("El teléfono debe tener entre 10 y 15 dígitos.");
      if (pat.telefonoConfianza && !RE_TELEFONO.test(pat.telefonoConfianza))
        return setError(
          "El teléfono de confianza debe tener entre 10 y 15 dígitos.",
        );
      patientPayload = {
        numControlOEmpleado: pat.numControlOEmpleado.trim(),
        tipoPersona: pat.tipoPersona,
      };
      if (pat.fechaNacimiento)
        patientPayload.fechaNacimiento = pat.fechaNacimiento;
      if (pat.telefono) patientPayload.telefono = pat.telefono;
      if (pat.telefonoConfianza)
        patientPayload.telefonoConfianza = pat.telefonoConfianza;
      if (pat.contactoPreferido)
        patientPayload.contactoPreferido = pat.contactoPreferido;
    }

    if (user.id_rol === 2) {
      const duracion = Number(psy.duracionCitaMinutos);
      if (!psy.cedulaProfesional.trim())
        return setError("La cédula profesional es obligatoria.");
      if (!Number.isInteger(duracion) || duracion < 10 || duracion > 240)
        return setError(
          "La duración de la cita debe estar entre 10 y 240 minutos.",
        );
      psychologistPayload = {
        cedulaProfesional: psy.cedulaProfesional.trim(),
        duracionCitaMinutos: duracion,
        chatDisponible: psy.chatDisponible,
        activoParaCitas: psy.activoParaCitas,
      };
      if (psy.especialidad.trim())
        psychologistPayload.especialidad = psy.especialidad.trim();
    }

    try {
      setSaving(true);
      setError("");
      await usersApi.update(user.id_usuario, { correo, nombre });
      if (patientPayload)
        await patientsApi.update(user.id_usuario, patientPayload);
      if (psychologistPayload)
        await psychologistsApi.update(user.id_usuario, psychologistPayload);
      onSaved();
    } catch (e: any) {
      setError(errMsg(e, "No fue posible guardar los cambios."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="mt-3 gap-4 border-t border-border pt-4">
      <Input
        label="Nombre"
        value={base.nombre}
        onChangeText={(v) => setBase((p) => ({ ...p, nombre: v }))}
      />
      <Input
        label="Correo"
        autoCapitalize="none"
        keyboardType="email-address"
        value={base.correo}
        onChangeText={(v) => setBase((p) => ({ ...p, correo: v }))}
      />

      {loadingDetail ? (
        <Muted>Cargando datos del perfil…</Muted>
      ) : (
        <>
          {user.id_rol === 1 && (
            <>
              <Input
                label="Número de control o empleado"
                value={pat.numControlOEmpleado}
                onChangeText={(v) =>
                  setPat((p) => ({ ...p, numControlOEmpleado: v }))
                }
              />
              <Field label="Tipo de persona">
                <Chips
                  options={TIPOS_PERSONA}
                  value={pat.tipoPersona}
                  onChange={(v) => setPat((p) => ({ ...p, tipoPersona: v }))}
                />
              </Field>
              <Input
                label="Fecha de nacimiento (AAAA-MM-DD)"
                placeholder="2003-05-15"
                autoCapitalize="none"
                value={pat.fechaNacimiento}
                onChangeText={(v) =>
                  setPat((p) => ({ ...p, fechaNacimiento: v }))
                }
              />
              <Input
                label="Teléfono"
                keyboardType="phone-pad"
                value={pat.telefono}
                onChangeText={(v) => setPat((p) => ({ ...p, telefono: v }))}
              />
              <Input
                label="Teléfono de confianza"
                keyboardType="phone-pad"
                value={pat.telefonoConfianza}
                onChangeText={(v) =>
                  setPat((p) => ({ ...p, telefonoConfianza: v }))
                }
              />
              <Field label="Contacto preferido">
                <Chips
                  options={CONTACTO}
                  value={pat.contactoPreferido}
                  onChange={(v) =>
                    setPat((p) => ({ ...p, contactoPreferido: v }))
                  }
                />
              </Field>
            </>
          )}

          {user.id_rol === 2 && (
            <>
              <Input
                label="Cédula profesional"
                value={psy.cedulaProfesional}
                onChangeText={(v) =>
                  setPsy((p) => ({ ...p, cedulaProfesional: v }))
                }
              />
              <Input
                label="Especialidad"
                value={psy.especialidad}
                onChangeText={(v) => setPsy((p) => ({ ...p, especialidad: v }))}
              />
              <Input
                label="Duración de la cita (minutos)"
                keyboardType="number-pad"
                value={psy.duracionCitaMinutos}
                onChangeText={(v) =>
                  setPsy((p) => ({ ...p, duracionCitaMinutos: v }))
                }
              />
              <Field label="Chat disponible">
                <Chips
                  options={SI_NO}
                  value={psy.chatDisponible}
                  onChange={(v) => setPsy((p) => ({ ...p, chatDisponible: v }))}
                />
              </Field>
              <Field label="Disponible para citas">
                <Chips
                  options={SI_NO}
                  value={psy.activoParaCitas}
                  onChange={(v) =>
                    setPsy((p) => ({ ...p, activoParaCitas: v }))
                  }
                />
              </Field>
            </>
          )}
        </>
      )}

      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <View className="flex-row gap-2">
        <Button
          title="Guardar cambios"
          loading={saving}
          disabled={loadingDetail}
          onPress={() => void submit()}
        />
        <Button title="Cancelar" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function Users() {
  const { user: me } = useAuth();
  const [filtro, setFiltro] = useState(0); // 0 = todos
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const q = useLoad<User[]>(() => usersApi.list(filtro || undefined), [filtro]);

  // Solo muestra la pantalla de carga la primera vez, para no perder el formulario.
  if (q.loading && !q.data) return <Loading />;

  const toggleActive = async (u: User) => {
    try {
      setNotice(null);
      await usersApi.setActive(u.id_usuario, !u.activo);
      setNotice({
        ok: true,
        text: `${u.nombre} ${u.activo ? "desactivado" : "reactivado"}.`,
      });
      await q.reload();
    } catch (e: any) {
      setNotice({
        ok: false,
        text: errMsg(e, "No fue posible cambiar el estado."),
      });
    }
  };

  return (
    <>
      <AppHeader />
      <Screen>
        <View className="mb-5 flex-row flex-wrap items-start justify-between gap-3">
          <View className="flex-1">
            <H1>Usuarios</H1>
            <Muted>Cuentas registradas y estado de acceso.</Muted>
          </View>
          {!creating && (
            <Button
              title="Nuevo usuario"
              onPress={() => {
                setCreating(true);
                setEditingId(null);
                setNotice(null);
              }}
            />
          )}
        </View>

        {creating && (
          <CreateUserForm
            onCancel={() => setCreating(false)}
            onCreated={(u) => {
              setCreating(false);
              setNotice({ ok: true, text: `Usuario ${u.nombre} creado.` });
              void q.reload();
            }}
          />
        )}

        <View className="mb-4">
          <Chips
            options={[
              { value: 0, label: "Todos" },
              { value: 1, label: "Pacientes" },
              { value: 2, label: "Psicólogos" },
              { value: 3, label: "Administradores" },
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
          items={q.data ?? []}
          keyOf={(x) => x.id_usuario}
          renderTitle={(x) => x.nombre}
          renderSubtitle={(x) =>
            `${x.correo} · ${ROLES[x.id_rol] ?? `Rol ${x.id_rol}`} · ${x.activo ? "Activo" : "Inactivo"}`
          }
          action={(x) =>
            editingId === x.id_usuario ? (
              <EditUserForm
                user={x}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  setNotice({
                    ok: true,
                    text: `Datos de ${x.nombre} actualizados.`,
                  });
                  void q.reload();
                }}
              />
            ) : (
              <View className="mt-3 flex-row flex-wrap gap-2">
                <Button
                  title="Editar"
                  variant="secondary"
                  onPress={() => {
                    setEditingId(x.id_usuario);
                    setCreating(false);
                    setNotice(null);
                  }}
                />
                {/* Un administrador no puede desactivar su propia cuenta. */}
                {me?.userId !== x.id_usuario && (
                  <Button
                    title={x.activo ? "Desactivar" : "Reactivar"}
                    variant={x.activo ? "danger" : "success"}
                    onPress={() => void toggleActive(x)}
                  />
                )}
              </View>
            )
          }
        />
      </Screen>
    </>
  );
}
