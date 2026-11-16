import { Redirect } from "expo-router";

/** El registro vive ahora en la misma tarjeta del login; esta ruta se conserva por compatibilidad. */
export default function Register() {
  return (
    <Redirect
      href={{ pathname: "/(auth)/login", params: { modo: "registro" } }}
    />
  );
}
