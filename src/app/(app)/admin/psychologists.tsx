import { psychologistsApi } from "@/api/psychologists";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { H1, Muted } from "@/components/ui/typography";
import { useLoad } from "@/hooks/use-load";
import { Psychologist } from "@/types/api";
export default function Psychologists() {
  const q = useLoad<Psychologist[]>(() => psychologistsApi.list(false));
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Psicólogos</H1>
        <Muted className="mb-5">Especialistas registrados.</Muted>
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_psicologo}
          renderTitle={(x) => x.nombre}
          renderSubtitle={(x) =>
            `${x.especialidad ?? "Sin especialidad"} · ${x.activo_para_citas ? "Disponible" : "No disponible"}`
          }
        />
      </Screen>
    </>
  );
}
