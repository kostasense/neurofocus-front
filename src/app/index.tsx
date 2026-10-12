import { Redirect } from "expo-router";
import { useAuth } from "@/context/auth-context";
export default function Index() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/(auth)/login" />;
  return (
    <Redirect
      href={
        user.rol === 1
          ? "/(app)/patient"
          : user.rol === 2
            ? "/(app)/psychologist"
            : "/(app)/admin"
      }
    />
  );
}
