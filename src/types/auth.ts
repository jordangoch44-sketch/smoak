export type AuthRole = "client" | "specialist";

export interface AuthSession {
  role: AuthRole;
  email: string;
  signedInAt: string;
}
