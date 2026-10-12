import { chatApi } from "@/api/chat";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { H1, Muted } from "@/components/ui/typography";
import { useLoad } from "@/hooks/use-load";
import { PanicAlert } from "@/types/api";
export default function Alerts() {
  const q = useLoad<PanicAlert[]>(() => chatApi.alerts());
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Alertas</H1>
        <Muted className="mb-5">
          Seguimiento operativo de alertas de pánico.
        </Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_alerta}
          renderTitle={(x) => x.paciente ?? `Paciente #${x.id_paciente}`}
          renderSubtitle={(x) =>
            `${new Date(x.fecha_alerta).toLocaleString("es-MX")} · Estado ${x.estado}`
          }
        />
      </Screen>
    </>
  );
}
