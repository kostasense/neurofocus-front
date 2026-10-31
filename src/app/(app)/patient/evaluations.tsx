import { evaluationsApi } from "@/api/evaluations";
import { SimpleList } from "@/components/data/simple-list";
import { Loading } from "@/components/feedback/loading";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useLoad } from "@/hooks/use-load";
import { formatDate } from "@/lib/format";
import type { Evaluation } from "@/types/api";
import { Alert } from "react-native";
export default function Evaluations() {
  const { user } = useAuth();
  const q = useLoad<Evaluation[]>(
    () => evaluationsApi.byPatient(user!.userId),
    [user?.userId],
  );
  if (q.loading) return <Loading />;
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Mis evaluaciones</H1>
        <Muted className="mb-5">
          Puedes completar los instrumentos en momentos distintos.
        </Muted>
        <Button
          title="Nueva evaluación"
          className="mb-5 self-start"
          onPress={async () => {
            try {
              await evaluationsApi.create();
              await q.reload();
            } catch (e: any) {
              Alert.alert(
                "Aviso",
                e?.response?.data?.message ?? "No fue posible crearla",
              );
            }
          }}
        />
        <SimpleList
          items={q.data ?? []}
          keyOf={(x) => x.id_evaluacion}
          renderTitle={(x) => `Evaluación #${x.id_evaluacion}`}
          renderSubtitle={(x) =>
            `Estado ${x.estado} · ${formatDate(x.fecha_inicio)}`
          }
        />
      </Screen>
    </>
  );
}
