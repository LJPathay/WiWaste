<?php

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| The route table itself lives in `routes/api_routes.php` and is mounted twice:
| once under the `/v1` prefix the frontend uses, and once unprefixed for legacy
| clients. Both mounts share one definition so the two surfaces cannot drift.
|
| Authentication is applied to the whole table rather than route-by-route.
| Previously only `/me`, `/logout` and `/refresh` were guarded, which left every
| other endpoint — user management, sales, audit logs, settings — readable and
| writable without a token.
|
| `withoutMiddleware('auth:sanctum')` marks the genuinely public endpoints:
| login, password reset, and the health check polled by uptime monitors.
|
*/

use App\Http\Middleware\ForceHttps;
use App\Http\Middleware\RateLimitMiddleware;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Support\Facades\Route;

$middleware = [
    SecurityHeaders::class,
    ForceHttps::class,
    RateLimitMiddleware::class,
    'auth:sanctum',
];

$routes = require __DIR__.'/api_routes.php';

Route::prefix('v1')->middleware($middleware)->group($routes);

// Backward compatibility routes (without v1 prefix) for legacy tests/clients.
Route::middleware($middleware)->group($routes);
