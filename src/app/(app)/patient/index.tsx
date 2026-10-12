import { View } from "react-native";
import {
  CalendarDays,
  ClipboardList,
  MessageCircle,
  Bell,
  UserRound,
  Lightbulb,
} from "lucide-react-native";
import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { H1, Muted } from "@/components/ui/typography";
export default function PatientDashboard() {
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Mi espacio</H1>
        <Muted className="mt-1 mb-6">
          Evaluaciones, citas y acompañamiento.
        </Muted>
        <View className="flex-row flex-wrap gap-4">
          <DashboardCard
            title="Evaluaciones"
            description="Completa PSS-14, GAD-7 y PHQ-9."
            href="/(app)/patient/evaluations"
            icon={ClipboardList}
          />
          <DashboardCard
            title="Citas"
            description="Consulta horarios y agenda una cita."
            href="/(app)/patient/appointments"
            icon={CalendarDays}
          />
          <DashboardCard
            title="Chat"
            description="Comunícate con tu psicólogo asignado."
            href="/(app)/patient/chat"
            icon={MessageCircle}
          />
          <DashboardCard
            title="Notificaciones"
            description="Revisa avisos y recordatorios."
            href="/(app)/shared/notifications"
            icon={Bell}
          />
          <DashboardCard
            title="Sugerencias"
            description="Comparte comentarios sobre la plataforma."
            href="/(app)/shared/suggestions"
            icon={Lightbulb}
          />
          <DashboardCard
            title="Mi perfil"
            description="Actualiza tus datos de contacto."
            href="/(app)/patient/profile"
            icon={UserRound}
          />
        </View>
      </Screen>
    </>
  );
}
