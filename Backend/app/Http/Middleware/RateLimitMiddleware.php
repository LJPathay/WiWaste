<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
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
    private const PASSWORD_LIMIT = ['max' => 3, 'decay' => 15]; // Canonical password request throttling; account OTP guesses are bounded separately.

    public function handle(Request $request, Closure $next): Response
    {
        // Skip rate limiting for health checks
        if ($request->is('health', 'api/health', 'api/v1/health')) {
            return $next($request);
        }

        $user = $this->resolveUser($request);
        // The DB stores canonical roles as 'Owner'/'Inventory'/'Cashier' while the
        // limit table is keyed lowercase. Without normalising, every authenticated
        // request fell through to the guest bucket and got 30 reads/hour.
        $role = $user?->role
            ? $this->normalizeRole((string) $user->role)
            : 'guest';
        $isApi = $request->is('api/*');
        // Auth routes are registered twice: under /api/* and /api/v1/*. Both
        // shapes must match or the strict limits below are silently skipped.
        $isAuth = $request->is('api/login', 'api/v1/login', 'api/register', 'api/v1/register', 'api/forgot-password', 'api/reset-password', 'api/v1/forgot-password', 'api/v1/reset-password');
        $isPassword = $request->is('api/password/*', 'api/v1/password/*');
        $isWrite = in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE']);
        $key = $this->resolveRequestSignature($request);

        // Check the strictest bucket first (auth/password, then write, then read).
        if ($blocked = $this->findBlockedResponse($key, $role, $isApi, $isAuth, $isPassword, $isWrite)) {
            return $blocked;
        }

        $response = $next($request);

        $this->recordHits($key, $isApi, $isAuth, $isPassword, $isWrite);
        $this->addRateLimitHeaders($response, $key, $role, $isApi, $isAuth, $isPassword, $isWrite);

        return $response;
    }

    /**
     * Returns a 429 response when the caller has exhausted any applicable
     * bucket, or null when the request is still allowed.
     */
    private function findBlockedResponse(string $key, string $role, bool $isApi, bool $isAuth, bool $isPassword, bool $isWrite): ?Response
    {
        if ($isAuth || $isPassword) {
            $limit = $isPassword ? self::PASSWORD_LIMIT : self::AUTH_LIMIT;
            if (RateLimiter::tooManyAttempts("auth:{$key}", $limit['max'])) {
                return $this->rateLimitResponse("auth:{$key}");
            }
        }

        if ($isApi) {
            $limits = self::ROLE_LIMITS[$role] ?? self::ROLE_LIMITS['guest'];
            $bucket = $isWrite ? 'write' : 'read';

            if (RateLimiter::tooManyAttempts("api:{$bucket}:{$key}", $limits[$bucket])) {
                return $this->rateLimitResponse("api:{$bucket}:{$key}");
            }
        }

        return null;
    }

    /**
     * Increments every counter that applies to this request, once the response
     * has been produced.
     */
    private function recordHits(string $key, bool $isApi, bool $isAuth, bool $isPassword, bool $isWrite): void
    {
        if (! $isApi) {
            return;
        }

        if ($isAuth || $isPassword) {
            $limit = $isPassword ? self::PASSWORD_LIMIT : self::AUTH_LIMIT;
            RateLimiter::hit("auth:{$key}", $limit['decay'] * 60);

            return;
        }

        if ($isWrite) {
            RateLimiter::hit("api:write:{$key}", 3600);
        }
        RateLimiter::hit("api:read:{$key}", 3600);
    }

    /**
     * Maps stored role values onto the ROLE_LIMITS keys.
     */
    protected function normalizeRole(string $role): string
    {
        return match (strtolower(trim($role))) {
            'owner', 'admin', 'administrator' => 'owner',
            'business owner' => 'cashier',
            'inventory', 'stock', 'pharmacist' => 'inventory',
            'cashier', 'sales', 'pos' => 'cashier',
            default => 'guest',
        };
    }

    protected function resolveRequestSignature(Request $request): string
    {
        if ($user = $this->resolveUser($request)) {
            return 'user:'.$user->User_id;
        }

        return 'ip:'.$request->ip();
    }

    /**
     * This middleware is registered on the route group, so it runs *before* the
     * route-level `auth:sanctum` guard. That left $request->user() null on every
     * authenticated call, which put all real users in the guest bucket (30 reads/hour)
     * and rate-limited legitimate traffic. Resolve the token ourselves when needed.
     */
    protected function resolveUser(Request $request)
    {
        if ($user = $request->user()) {
            return $user;
        }

        // No bearer token means the caller is genuinely a guest; resolving the
        // Sanctum guard would just return null for the same reason.
        if (! $request->bearerToken()) {
            return null;
        }

        return $this->resolveSanctumUser();
    }

    /**
     * A malformed or stale token must not 500 the request; treat it as
     * a guest so the rate limiter still buckets it.
     */
    private function resolveSanctumUser()
    {
        try {
            return Auth::guard('sanctum')->user();
        } catch (\Throwable) {
            return null;
        }
    }

    protected function rateLimitResponse(string $key): Response
    {
        $retryAfter = RateLimiter::availableIn($key);

        return response()->json([
            'message' => 'Too many requests. Please try again later.',
            'retry_after' => $retryAfter,
        ], 429)->header('Retry-After', $retryAfter);
    }

    protected function addRateLimitHeaders(Response $response, string $key, string $role, bool $isApi, bool $isAuth, bool $isPassword, bool $isWrite): void
    {
        if (! $isApi) {
            return;
        }

        $primaryKey = 'api:read:'.$key;
        if ($isAuth || $isPassword) {
            $primaryKey = 'auth:'.$key;
        } elseif ($isWrite) {
            $primaryKey = 'api:write:'.$key;
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

        if (! $isApi) {
            return 200;
        }

        $limits = self::ROLE_LIMITS[$role] ?? self::ROLE_LIMITS['guest'];

        return $isWrite ? $limits['write'] : $limits['read'];
    }
}
