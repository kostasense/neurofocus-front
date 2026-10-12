import { notificationsApi } from "@/api/notifications";
import { useLoad } from "@/hooks/use-load";
import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { H1, Muted } from "@/components/ui/typography";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import type { Notification } from "@/types/api";
export default function Notifications() {
  const q = useLoad<Notification[]>(() =>
    notificationsApi.mine({ limite: 50 }),
  );
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Notificaciones</H1>
        <Muted className="mb-5">
          Avisos de citas, chat, alertas y sistema.
        </Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_notificacion}
          renderTitle={(x) => x.titulo}
          renderSubtitle={(x) =>
            `${x.cuerpo} · ${new Date(x.fecha_creacion).toLocaleString("es-MX")}`
          }
        />
      </Screen>
    </>
  );
}
