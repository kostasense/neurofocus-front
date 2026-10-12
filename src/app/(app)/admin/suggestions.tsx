import { suggestionsApi } from "@/api/suggestions";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { H1, Muted } from "@/components/ui/typography";
import { useLoad } from "@/hooks/use-load";
import { Suggestion } from "@/types/api";
export default function Suggestions() {
  const q = useLoad<Suggestion[]>(() => suggestionsApi.list());
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Buzón de sugerencias</H1>
        <Muted className="mb-5">Revisión y seguimiento institucional.</Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_sugerencia}
          renderTitle={(x) => `Categoría ${x.categoria}`}
          renderSubtitle={(x) => `${x.comentario} · Estado ${x.estado}`}
        />
      </Screen>
    </>
  );
}
