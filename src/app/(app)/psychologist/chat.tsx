import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { H1, Muted } from "@/components/ui/typography";
export default function Chat() {
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Chat privado</H1>
        <Muted>
          La interfaz E2EE debe cifrar y descifrar localmente antes de usar los
          endpoints del módulo chat.
        </Muted>
      </Screen>
    </>
  );
}
