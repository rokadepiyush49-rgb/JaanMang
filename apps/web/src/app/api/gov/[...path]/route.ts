/**
 * The government workspace's proxy path.
 *
 * Identical to `/api/backend/*` — kept as its own route because every `/gov`
 * screen already calls it through `lib/api/client.ts`. Both names resolve to
 * the same handler in `src/lib/auth/proxy-handler.ts`.
 */
import { handleProxy } from "@/lib/auth/proxy-handler";

export { clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const dynamic = "force-dynamic";
