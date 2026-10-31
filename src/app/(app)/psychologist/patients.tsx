import { psychologistsApi } from "@/api/psychologists";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { formatDateTime } from "@/lib/format";
import { DashboardPatient } from "@/types/api";
export default function Patients() {
  const { user } = useAuth();
  const q = useLoad<DashboardPatient[]>(
    () => psychologistsApi.dashboardPatients(user!.userId),
    [user?.userId],
  );
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Pacientes</H1>
        <Muted className="mb-5">Asignaciones activas y seguimiento.</Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_paciente}
          renderTitle={(x) => x.paciente}
          renderSubtitle={(x) =>
            `Tipo ${x.tipo_persona} · Próxima cita: ${x.proxima_cita ? formatDateTime(x.proxima_cita) : "Sin cita"}`
          }
        />
      </Screen>
    </>
  );
}
