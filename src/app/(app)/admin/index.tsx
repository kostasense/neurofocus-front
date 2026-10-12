import { View } from "react-native";
import {
  Users,
  UserRoundCog,
  BarChart3,
  Lightbulb,
  Bell,
  ShieldCheck,
} from "lucide-react-native";
import { Screen } from "@/components/layout/screen";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { H1, Muted } from "@/components/ui/typography";
export default function AdminDashboard() {
  return (
    <>
      <AppHeader />
      <Screen>
        <H1>Administración</H1>
        <Muted className="mt-1 mb-6">Panel de control del sistema.</Muted>
        <View className="flex-row flex-wrap gap-4">
          <DashboardCard
            title="Usuarios"
            description="Administra cuentas y estados."
            href="/(app)/admin/users"
            icon={Users}
          />
          <DashboardCard
            title="Psicólogos"
            description="Gestiona especialistas registrados."
            href="/(app)/admin/psychologists"
            icon={UserRoundCog}
          />
          <DashboardCard
            title="Asignaciones"
            description="Revisa relaciones paciente-psicólogo."
            href="/(app)/admin/assignments"
            icon={ShieldCheck}
          />
          <DashboardCard
            title="Sugerencias"
            description="Atiende el buzón institucional."
            href="/(app)/admin/suggestions"
            icon={Lightbulb}
          />
          <DashboardCard
            title="Métricas"
            description="Consulta indicadores globales."
            href="/(app)/admin/metrics"
            icon={BarChart3}
          />
          <DashboardCard
            title="Notificaciones"
            description="Envía avisos administrativos."
            href="/(app)/shared/notifications"
            icon={Bell}
          />
        </View>
      </Screen>
    </>
  );
}
