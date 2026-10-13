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

  // Only hand the child a PATH made of fixed, system-owned directories. The inherited
  // PATH (which Playwright/Vite prepend to) can contain writable entries, so a stray
  // `php` staged earlier on the search path would be executed instead of the real one.
  // `PHP_BINARY` wins when set, so an operator can point at an absolute interpreter
  // without touching this list.
  const SYSTEM_PATH =
    process.platform === 'win32'
      ? [
          process.env.SystemRoot ? `${process.env.SystemRoot}\\System32` : 'C:\\Windows\\System32',
          process.env.SystemRoot ?? 'C:\\Windows',
        ]
      : ['/usr/local/bin', '/usr/bin', '/bin'];

  const phpBinary = process.env.PHP_BINARY?.trim() || 'php';
  const childEnv = { ...process.env, PATH: SYSTEM_PATH.join(path.delimiter) };
  const childOptions = { cwd: backendDir, stdio: 'inherit' as const, env: childEnv };

  try {
    execFileSync(phpBinary, ['artisan', 'migrate:fresh', '--seed', '--force', '--no-interaction'], childOptions);
  } catch (err) {
    // An interpreter installed outside the system directories fails with ENOENT under
    // the restricted PATH. Retrying with the inherited PATH keeps those setups working.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    execFileSync(phpBinary, ['artisan', 'migrate:fresh', '--seed', '--force', '--no-interaction'], {
      cwd: backendDir,
      stdio: 'inherit',
    });
  }
}