# Deployment & Documentation

> **Objective:** Ship the system to a production-like environment and update the documentation so anyone
> can install, run, and demo WiWaste — including the new Python service.

---

## 1. Goal

1. The app builds and runs in a **production-style** setup (real env, built frontend, MySQL, optional Docker).
2. The Python ML service is part of the stack, with the PHP fallback as the safety net.
3. `README.md` documents everything: prerequisites, install, env vars, new endpoints, and the demo flow.

## 2. Status

- **Not started.**
- `README.md` covers local dev (Laravel + Vite) but not: production build, the Python service, the new
  endpoints, or Docker.

## 3. Production build steps (no Docker)

### 3.1 Backend
1. `cd Backend && composer install --no-dev --optimize-autoloader`
2. `cp .env.example .env` → set:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://your-domain
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_DATABASE=CAP22
   DB_USERNAME=root
   DB_PASSWORD=...
   ML_SERVICE_URL=http://127.0.0.1:8001
   ```
3. `php artisan key:generate`
4. `php artisan migrate --force` (or `migrate:fresh --seed` for a fresh demo)
5. `php artisan config:cache && php artisan route:cache`
6. Serve via PHP-FPM / Apache / Nginx pointing at `Backend/public/`.

### 3.2 Python ML service
```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate          # Windows (POSIX: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8001
```
- Run it as a background service (e.g., NSSM on Windows or systemd on Linux).
- **Important:** Laravel works even if this service is down — it falls back to the PHP risk scorer.

### 3.3 Frontend
```bash
cd Frontend
npm install
echo "VITE_API_URL=https://your-domain/api" > .env.production
npm run build        # outputs to Frontend/dist/
```
- Serve `Frontend/dist/` from any static host (Nginx, Vercel, Netlify, Apache).
- Make sure **CORS** in `Backend/config/cors.php` allows the frontend origin.

### 3.4 Scheduler (forecast)
Add a cron entry on the server (Linux) or a scheduled task (Windows) so forecasts regenerate daily:

```bash
* * * * * cd /path/to/WiWaste/Backend && php artisan schedule:run >> /dev/null 2>&1
```

## 4. Docker (optional, one-file stack)

Add to the repo root:

- `Dockerfile` — Laravel app (PHP 8.3 + FPM + Nginx or `php artisan serve`).
- `ml-service/Dockerfile` — Python service.
- `docker-compose.yml` — services:
  ```yaml
  services:
    app:        # Laravel
    mysql:      # MySQL 8
    ml-service: # Python FastAPI on port 8001
  ```
- The Laravel container gets `ML_SERVICE_URL=http://ml-service:8001` so it talks to the container hostname.

> The hybrid design means Docker is a convenience, not a requirement — the system still runs without it.

## 5. Documentation updates (README.md)

Update the existing `Backend/README.md`-style root `README.md` (the one at the repo root) to add:

1. **Project structure** — add `ml-service/` and `docs/implementation-plan/`.
2. **ML service setup** — the `uvicorn` commands above + `ML_SERVICE_URL` explanation.
3. **New environment variables** — `ML_SERVICE_URL`.
4. **New API endpoints** — link to Sprint 2/3/4 contract sections:
   - `/forecast/*`, `/loss-risk/*`, `/optimization/replenishment`.
5. **Production deployment** — the steps in section 3.
6. **Demo script** — the 7-step walkthrough from the Testing & Evaluation file.
7. **Sprint roadmap link** — point to `docs/implementation-plan/implementationplan.md`.

> No other doc files are created unless asked. Keep README as the single entry point.

## 6. Definition of Done

- [ ] Backend boots with `APP_ENV=production`, migrations applied, caches warmed.
- [ ] `Frontend/dist/` builds and is served; CORS allows the origin.
- [ ] `ml-service` starts with `uvicorn` and `/health` returns ok.
- [ ] Forecast scheduler cron/scheduled task configured.
- [ ] (Optional) `docker-compose up` starts app + mysql + ml-service.
- [ ] `README.md` updated per section 5.
- [ ] Fresh-install test: someone follows README on a clean machine and reaches the demo script.
