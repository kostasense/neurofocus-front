import { recordsApi } from "@/api/records";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { RecordSummary } from "@/types/api";
export default function Records() {
  const { user } = useAuth();
  const q = useLoad<RecordSummary[]>(
    () => recordsApi.byPsychologist(user!.userId),
    [user?.userId],
  );
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Expedientes</H1>
        <Muted className="mb-5">Información profesional cifrada.</Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_expediente}
          renderTitle={(x) => x.paciente}
          renderSubtitle={(x) =>
            `Expediente #${x.id_expediente} · Estado ${x.estado}`
          }
        />
      </Screen>
    </>
  );
}
