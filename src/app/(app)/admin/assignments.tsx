import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { H1, Muted } from "@/components/ui/typography";
export default function Assignments() {
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Asignaciones</H1>
        <Muted>
          Administra altas y cierres de relaciones paciente-psicólogo.
        </Muted>
      </Screen>
    </>
  );
}
