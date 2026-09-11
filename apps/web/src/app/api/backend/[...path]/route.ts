/**
 * The session-attaching proxy every surface uses.
 *
 * `/api/backend/<path>` → `${BACKEND_API_URL}/api/v1/<path>`, with the bearer
 * taken from the httpOnly cookie and the refresh rotation handled server-side.
 * See `src/lib/auth/proxy-handler.ts`.
 */
import { handleProxy } from "@/lib/auth/proxy-handler";

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const dynamic = "force-dynamic";
