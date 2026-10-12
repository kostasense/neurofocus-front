export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const roleHome = (role: number) =>
  role === 1
    ? "/(app)/patient"
    : role === 2
      ? "/(app)/psychologist"
      : "/(app)/admin";
