<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class RateLimitMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Skip rate limiting for health checks
        if ($request->is('health') || $request->is('api/health')) {
            return $next($request);
        }

        // Determine rate limit key
        $key = $this->resolveRequestSignature($request);

        // Different limits for different route types
        $limits = $this->getRateLimits($request);

        foreach ($limits as $limit) {
            $keyPrefix = $limit['prefix'];
            $maxAttempts = $limit['max'];
            $decayMinutes = $limit['decay'];

            if (RateLimiter::tooManyAttempts($keyPrefix . $key, $maxAttempts)) {
                $retryAfter = RateLimiter::availableIn($keyPrefix . $key);

                return response()->json([
                    'message' => 'Too many requests. Please try again later.',
                    'retry_after' => $retryAfter,
                ], 429)->header('Retry-After', $retryAfter);
            }
        }

        $response = $next($request);

        // Increment hit counters for successful requests
        foreach ($limits as $limit) {
            $keyPrefix = $limit['prefix'];
            RateLimiter::hit($keyPrefix . $key, $limit['decay'] * 60);
        }

        // Add rate limit headers
        $firstLimit = $limits[0];
        $remaining = max(0, $firstLimit['max'] - RateLimiter::attempts($firstLimit['prefix'] . $key));
        $response = $response ?? response();
        $response->headers->set('X-RateLimit-Limit', $firstLimit['max']);
        $response->headers->set('X-RateLimit-Remaining', $remaining);
        $response->headers->set('X-RateLimit-Reset', now()->addMinutes($firstLimit['decay'])->timestamp);

        return $response;
    }

    protected function resolveRequestSignature(Request $request): string
    {
        if ($user = $request->user()) {
            return 'user:' . $user->User_id;
        }

        return 'ip:' . $request->ip();
    }

    protected function getRateLimits(Request $request): array
    {
        $isApi = $request->is('api/*');
        $isAuth = $request->is('api/login') || $request->is('api/register') || $request->is('api/password/*');
        $isWrite = in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE']);

        if ($isAuth) {
            return [
                ['prefix' => 'auth:', 'max' => 10, 'decay' => 15], // 10 attempts per 15 min
            ];
        }

        if ($isApi) {
            if ($isWrite) {
                return [
                    ['prefix' => 'api:write:', 'max' => 100, 'decay' => 60], // 100 writes per hour
                    ['prefix' => 'api:', 'max' => 1000, 'decay' => 60], // 1000 requests per hour
                ];
            }

            return [
                ['prefix' => 'api:read:', 'max' => 500, 'decay' => 60], // 500 reads per hour
            ];
        }

        // Web routes
        return [
            ['prefix' => 'web:', 'max' => 200, 'decay' => 60],
        ];
    }
}