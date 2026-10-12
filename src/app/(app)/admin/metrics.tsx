import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { H1, Muted } from "@/components/ui/typography";
export default function Metrics() {
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Métricas globales</H1>
        <Muted>
          Conecta aquí endpoints agregados cuando estén disponibles en el
          backend.
        </Muted>
      </Screen>
    </>
  );
}
