"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "./session";

/**
 * The session, made readable by client components.
 *
 * This is a *convenience*, not a security boundary. Every layout resolves the
 * session on the server and passes it down; nothing here grants anything. A
 * client component that renders a button because `can()` returned true is
 * still calling an API that checks the same permission server-side, so a user
 * who tampers with this value gains a button and a 403.
 */
const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: SessionUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** The signed-in user. Null only outside a guarded layout. */
export function useSession(): SessionUser | null {
  return useContext(SessionContext);
}

/** Whether the signed-in user holds a permission. Display logic only. */
export function useCan(permission: string): boolean {
  const session = useSession();
  return session?.permissions.includes(permission) ?? false;
}
