import { View } from "react-native";
import { appointmentsApi } from "@/api/appointments";
import { psychologistsApi } from "@/api/psychologists";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { H1, Muted } from "@/components/ui/typography";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import type { Appointment } from "@/types/api";
export default function Appointments() {
  const { user } = useAuth();
  const q = useLoad<Appointment[]>(
    () => appointmentsApi.byPatient(user!.userId),
    [user?.userId],
  );
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Mis citas</H1>
        <Muted className="mb-5">
          Elige un psicólogo y un horario disponible para tu primera cita.
        </Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_cita}
          renderTitle={(x) => x.psicologo ?? `Psicólogo #${x.id_psicologo}`}
          renderSubtitle={(x) =>
            `${new Date(x.inicio).toLocaleString("es-MX")} · Estado ${x.estado}`
          }
        />
      </Screen>
    </>
  );
}
