import { appointmentsApi } from "@/api/appointments";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { formatDateTime } from "@/lib/format";
import type { Appointment } from "@/types/api";
export default function Agenda() {
  const { user } = useAuth();
  const q = useLoad<Appointment[]>(
    () => appointmentsApi.dashboard(user!.userId),
    [user?.userId],
  );
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Agenda</H1>
        <Muted className="mb-5">Citas próximas y estado de atención.</Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_cita}
          renderTitle={(x) => x.paciente ?? `Paciente #${x.id_paciente}`}
          renderSubtitle={(x) =>
            `${formatDateTime(x.inicio)} · Estado ${x.estado}`
          }
        />
      </Screen>
    </>
  );
}
