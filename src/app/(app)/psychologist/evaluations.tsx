import { evaluationsApi } from "@/api/evaluations";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { H1, Muted } from "@/components/ui/typography";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import type { Evaluation } from "@/types/api";
export default function Evaluations() {
  const { user } = useAuth();
  const q = useLoad<Evaluation[]>(
    () => evaluationsApi.byPsychologist(user!.userId),
    [user?.userId],
  );
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Evaluaciones</H1>
        <Muted className="mb-5">Resultados de pacientes asignados.</Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_evaluacion}
          renderTitle={(x) => `Paciente #${x.id_paciente}`}
          renderSubtitle={(x) =>
            `PSS ${x.pss14_puntaje ?? "-"} · GAD ${x.gad7_puntaje ?? "-"} · PHQ ${x.phq9_puntaje ?? "-"}`
          }
        />
      </Screen>
    </>
  );
}
