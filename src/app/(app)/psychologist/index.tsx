import { View } from "react-native";
import {
  CalendarDays,
  ClipboardList,
  MessageCircle,
  Bell,
  Users,
  FileText,
  Siren,
} from "lucide-react-native";
import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { H1, Muted } from "@/components/ui/typography";
export default function PsychDashboard() {
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Panel profesional</H1>
        <Muted className="mt-1 mb-6">Pacientes, agenda y seguimiento.</Muted>
        <View className="flex-row flex-wrap gap-4">
          <DashboardCard
            title="Pacientes"
            description="Consulta pacientes asignados."
            href="/(app)/psychologist/patients"
            icon={Users}
          />
          <DashboardCard
            title="Agenda"
            description="Administra horarios y citas."
            href="/(app)/psychologist/agenda"
            icon={CalendarDays}
          />
          <DashboardCard
            title="Evaluaciones"
            description="Revisa resultados y alertas."
            href="/(app)/psychologist/evaluations"
            icon={ClipboardList}
          />
          <DashboardCard
            title="Expedientes"
            description="Registra notas profesionales cifradas."
            href="/(app)/psychologist/records"
            icon={FileText}
          />
          <DashboardCard
            title="Chat"
            description="Atiende conversaciones habilitadas."
            href="/(app)/psychologist/chat"
            icon={MessageCircle}
          />
          <DashboardCard
            title="Alertas"
            description="Revisa alertas de pánico."
            href="/(app)/psychologist/alerts"
            icon={Siren}
          />
          <DashboardCard
            title="Notificaciones"
            description="Consulta avisos del sistema."
            href="/(app)/shared/notifications"
            icon={Bell}
          />
        </View>
      </Screen>
    </>
  );
}
