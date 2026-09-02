/**
 * No-op stand-in for the `server-only` package.
 *
 * The real package throws the moment it is imported outside a bundler that
 * has stripped it, which is correct in the app and useless in a test: the
 * council's engine modules mark themselves server-only, and `scripts/` needs
 * to import them directly under tsx.
 *
 * Mapped in `tsconfig.scripts.json` only, so the app build still gets the
 * real guard.
 */
export {};
