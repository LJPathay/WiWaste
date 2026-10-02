<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RateLimitMiddleware
{
    // Role-based limits (requests per hour)
    private const ROLE_LIMITS = [
        'owner' => ['read' => 1000, 'write' => 300],
        'inventory' => ['read' => 500, 'write' => 200],
        'cashier' => ['read' => 300, 'write' => 100],
        'guest' => ['read' => 30, 'write' => 10],
    ];

    // Stricter limits for auth endpoints
    private const AUTH_LIMIT = ['max' => 10, 'decay' => 15]; // 10 per 15 min

    // Password reset limits
    private const PASSWORD_LIMIT = ['max' => 3, 'decay' => 15]; // 3 per 15 min

    public function handle(Request $request, Closure $next): Response
    {
        // Skip rate limiting for health checks
        if ($request->is('health') || $request->is('api/health') || $request->is('api/v1/health')) {
            return $next($request);
        }

        $user = $request->user();
        $role = $user?->role ?? 'guest';
        $isApi = $request->is('api/*');
        // Auth routes are registered twice: under /api/* and /api/v1/*. Both
        // shapes must match or the strict limits below are silently skipped.
        $isAuth = $request->is('api/login', 'api/v1/login', 'api/register', 'api/v1/register');
        $isPassword = $request->is('api/password/*', 'api/v1/password/*');
        $isWrite = in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE']);

        // Determine limit key
        $key = $this->resolveRequestSignature($request);

        // Check auth endpoints first (strictest)
        if ($isAuth || $isPassword) {
            $limit = $isPassword ? self::PASSWORD_LIMIT : self::AUTH_LIMIT;
            if (RateLimiter::tooManyAttempts("auth:{$key}", $limit['max'])) {
                return $this->rateLimitResponse("auth:{$key}", $limit['decay']);
            }
        }

        // API rate limits based on role
        if ($isApi) {
            $limits = self::ROLE_LIMITS[$role] ?? self::ROLE_LIMITS['guest'];

            if ($isWrite) {
                if (RateLimiter::tooManyAttempts("api:write:{$key}", $limits['write'])) {
                    return $this->rateLimitResponse("api:write:{$key}", 60);
                }
            }

            if (RateLimiter::tooManyAttempts("api:read:{$key}", $limits['read'])) {
                return $this->rateLimitResponse("api:read:{$key}", 60);
            }
        }

        $response = $next($request);

        // Increment counters
        if ($isApi) {
            if ($isAuth || $isPassword) {
                $limit = $isPassword ? self::PASSWORD_LIMIT : self::AUTH_LIMIT;
                RateLimiter::hit("auth:{$key}", $limit['decay'] * 60);
            } else {
                $limits = self::ROLE_LIMITS[$role] ?? self::ROLE_LIMITS['guest'];
                if ($isWrite) {
                    RateLimiter::hit("api:write:{$key}", 3600);
                }
                RateLimiter::hit("api:read:{$key}", 3600);
            }
        }

        // Add rate limit headers
        $this->addRateLimitHeaders($response, $key, $role, $isApi, $isAuth, $isPassword, $isWrite);

        return $response;
    }

    protected function resolveRequestSignature(Request $request): string
    {
        if ($user = $request->user()) {
            return 'user:' . $user->User_id;
        }
        return 'ip:' . $request->ip();
    }

    protected function rateLimitResponse(string $key, int $decayMinutes): Response
    {
        $retryAfter = RateLimiter::availableIn($key);
        return response()->json([
            'message' => 'Too many requests. Please try again later.',
            'retry_after' => $retryAfter,
        ], 429)->header('Retry-After', $retryAfter);
    }

    protected function addRateLimitHeaders(Response $response, string $key, string $role, bool $isApi, bool $isAuth, bool $isPassword, bool $isWrite): void
    {
        if (!$isApi) return;

        $primaryKey = 'api:read:' . $key;
        if ($isAuth || $isPassword) {
            $primaryKey = 'auth:' . $key;
        } elseif ($isWrite) {
            $primaryKey = 'api:write:' . $key;
        }

        $limit = $this->getPrimaryLimit($role, $isApi, $isAuth, $isPassword, $isWrite);
        $attempts = RateLimiter::attempts($primaryKey);
        $remaining = max(0, $limit - $attempts);

        $response->headers->set('X-RateLimit-Limit', $limit);
        $response->headers->set('X-RateLimit-Remaining', $remaining);
        $response->headers->set('X-RateLimit-Reset', now()->addMinutes(60)->timestamp);
        $response->headers->set('X-RateLimit-Role', $role);
    }

    protected function getPrimaryLimit(string $role, bool $isApi, bool $isAuth, bool $isPassword, bool $isWrite): int
    {
        if ($isAuth || $isPassword) {
            return $isPassword ? self::PASSWORD_LIMIT['max'] : self::AUTH_LIMIT['max'];
        }

        if (!$isApi) return 200;

        $limits = self::ROLE_LIMITS[$role] ?? self::ROLE_LIMITS['guest'];
        return $isWrite ? $limits['write'] : $limits['read'];
    }
}