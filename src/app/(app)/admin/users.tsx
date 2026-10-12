import { usersApi } from "@/api/users";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { H1, Muted } from "@/components/ui/typography";
import { useLoad } from "@/hooks/use-load";
import { User } from "@/types/api";
export default function Users() {
  const q = useLoad<User[]>(() => usersApi.list());
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Usuarios</H1>
        <Muted className="mb-5">Cuentas registradas y estado de acceso.</Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_usuario}
          renderTitle={(x) => x.nombre}
          renderSubtitle={(x) =>
            `${x.correo} · Rol ${x.id_rol} · ${x.activo ? "Activo" : "Inactivo"}`
          }
        />
      </Screen>
    </>
  );
}
