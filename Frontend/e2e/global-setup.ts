import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..', '..', 'Backend');
const authCacheDir = path.resolve(here, '.auth-cache');

/**
 * The e2e suite drives the real Laravel API against the real database, so every run
 * starts from a deterministic schema + seed. Skipping this makes specs depend on
 * whatever a developer happened to leave in `wiwaste_db`.
 */
export default function globalSetup(): void {
  if (!existsSync(path.join(backendDir, 'artisan'))) {
    throw new Error(`Backend not found at ${backendDir} — cannot seed the e2e database.`);
  }

  // `migrate:fresh` drops `personal_access_tokens`, so any session cached by a previous
  // run points at a token that no longer exists. See `helpers/auth.ts`.
  rmSync(authCacheDir, { recursive: true, force: true });

  execFileSync('php', ['artisan', 'migrate:fresh', '--seed', '--force', '--no-interaction'], {
    cwd: backendDir,
    stdio: 'inherit',
  });
}