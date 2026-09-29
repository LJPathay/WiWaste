# Implementation Plan: Backend Security Hardening

## Overview
Implement adaptive rate limiting based on role + behavior, DDoS detection with alerting (no auto-block), and enhanced security headers.

## Current State
- `RateLimitMiddleware.php` exists with basic per-role limits
- `SecurityHeaders.php` has CSP, HSTS, basic headers
- No DDoS detection or adaptive behavior scoring
- No IP reputation tracking

## Tasks

### 3.1 Adaptive Rate Limiting Middleware

**File:** `Backend/app/Http/Middleware/RateLimitMiddleware.php` (REPLACE)

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class RateLimitMiddleware
{
    // Base limits per role (requests per hour)
    private const BASE_LIMITS = [
        'cashier' => ['read' => 300, 'write' => 100],
        'inventory' => ['read' => 500, 'write' => 200],
        'owner' => ['read' => 1000, 'write' => 300],
        'guest' => ['read' => 30, 'write' => 10],
    ];

    // Burst multipliers for legitimate spikes
    private const BURST_MULTIPLIER = [
        'cashier' => 2.0,    // POS rush hours
        'inventory' => 1.5,  // Receiving shipments
        'owner' => 1.0,
        'guest' => 0.5,
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Skip health checks
        if ($request->is('health') || $request->is('api/health') || $request->is('api/v1/health')) {
            return $next($request);
        }

        $user = $request->user();
        $role = $user?->role ?? 'guest';
        $key = $this->resolveKey($request, $user);
        $isWrite = in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE']);
        
        // Get adaptive limits
        $limits = $this->getAdaptiveLimits($role, $key, $isWrite);
        
        // Check each limit tier
        foreach ($limits as $limit) {
            if (RateLimiter::tooManyAttempts($limit['key'], $limit['max'])) {
                $retryAfter = RateLimiter::availableIn($limit['key']);
                
                // Log rate limit hit for DDoS analysis
                $this->logRateLimitHit($request, $role, $limit['tier'], $retryAfter);
                
                return response()->json([
                    'message' => 'Too many requests. Please try again later.',
                    'retry_after' => $retryAfter,
                    'limit_tier' => $limit['tier'],
                ], 429)->header('Retry-After', $retryAfter);
            }
        }

        $response = $next($request);

        // Increment counters on successful requests
        foreach ($limits as $limit) {
            RateLimiter::hit($limit['key'], $limit['decay'] * 60);
        }

        // Add rate limit headers
        $primary = $limits[0];
        $remaining = max(0, $primary['max'] - RateLimiter::attempts($primary['key']));
        $response->headers->set('X-RateLimit-Limit', $primary['max']);
        $response->headers->set('X-RateLimit-Remaining', $remaining);
        $response->headers->set('X-RateLimit-Reset', now()->addMinutes($primary['decay'])->timestamp);
        $response->headers->set('X-RateLimit-Role', $role);

        return $response;
    }

    protected function getAdaptiveLimits(string $role, string $key, bool $isWrite): array
    {
        $base = self::BASE_LIMITS[$role] ?? self::BASE_LIMITS['guest'];
        $burst = self::BURST_MULTIPLIER[$role] ?? 1.0;
        
        // Behavior scoring (0.5 - 2.0 multiplier)
        $behaviorScore = $this->getBehaviorScore($key);
        $effectiveMultiplier = $burst * $behaviorScore;

        $readMax = (int)($base['read'] * $effectiveMultiplier);
        $writeMax = (int)($base['write'] * $effectiveMultiplier);

        $limits = [];

        if ($isWrite) {
            limits[] = [
                'key' => "ratelimit:write:{$key}",
                'max' => $writeMax,
                'decay' => 60,
                'tier' => 'write',
            ];
        }

        limits[] = [
            'key' => "ratelimit:all:{$key}",
            'max' => $readMax + $writeMax,
            'decay' => 60,
            'tier' => 'combined',
        ];

        // Auth endpoints - stricter
        if ($request->is('api/login') || $request->is('api/password/*')) {
            limits[] = [
                'key' => "ratelimit:auth:{$key}",
                'max' => 10,
                'decay' => 15,
                'tier' => 'auth',
            ];
        }

        return limits;
    }

    protected function getBehaviorScore(string $key): float
    {
        // Score based on recent error rate, 4xx/5xx ratio, velocity
        $cacheKey = "behavior:{$key}";
        $data = Cache::get($cacheKey, [
            'requests' => 0,
            'errors' => 0,
            'last_reset' => now()->timestamp,
        ]);

        // Reset window every 15 minutes
        if (now()->timestamp - $data['last_reset'] > 900) {
            $data = ['requests' => 0, 'errors' => 0, 'last_reset' => now()->timestamp];
        }

        $data['requests']++;
        Cache::put($cacheKey, $data, 900);

        if ($data['requests'] < 10) return 1.0; // Not enough data

        $errorRate = $data['errors'] / $data['requests'];
        
        // Reduce limits if high error rate (potential attack)
        if ($errorRate > 0.5) return 0.3;
        if ($errorRate > 0.3) return 0.5;
        if ($errorRate > 0.1) return 0.7;
        
        return 1.0; // Normal behavior
    }

    protected function recordError(string $key): void
    {
        $cacheKey = "behavior:{$key}";
        $data = Cache::get($cacheKey, ['requests' => 0, 'errors' => 0, 'last_reset' => now()->timestamp]);
        $data['errors']++;
        Cache::put($cacheKey, $data, 900);
    }

    protected function resolveKey(Request $request, $user): string
    {
        if ($user) {
            return "user:{$user->User_id}";
        }
        return "ip:{$request->ip()}";
    }

    protected function logRateLimitHit(Request $request, string $role, string $tier, int $retryAfter): void
    {
        \Log::warning('Rate limit exceeded', [
            'role' => $role,
            'tier' => $tier,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'retry_after' => $retryAfter,
            'user_id' => $request->user()?->User_id,
        ]);
    }
}
```

### 3.2 DDoS Detection Middleware (Alert Only)

**File:** `Backend/app/Http/Middleware/DdosProtectionMiddleware.php` (NEW)

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class DdosProtectionMiddleware
{
    // Thresholds for alerting
    private const THRESHOLDS = [
        'requests_per_minute' => 300,      // Alert if single IP > 300 req/min
        'requests_per_5min' => 1000,       // Alert if single IP > 1000 req/5min
        'error_rate' => 0.5,               // Alert if > 50% errors in 5min
        'unique_endpoints_per_min' => 50,  // Alert if hitting > 50 unique endpoints/min
        'login_failures_per_15min' => 20,  // Alert if > 20 failed logins from IP
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $key = "ddos:{$ip}";
        
        // Track metrics
        $this->trackMetrics($key, $request);
        
        // Check thresholds
        $alerts = $this->checkThresholds($key, $ip, $request);
        
        if (!empty($alerts)) {
            $this->sendAlerts($alerts, $ip, $request);
        }

        return $next($request);
    }

    protected function trackMetrics(string $key, Request $request): void
    {
        $data = Cache::get($key, [
            'requests_1min' => 0,
            'requests_5min' => 0,
            'errors_5min' => 0,
            'endpoints_1min' => [],
            'login_failures_15min' => 0,
            'first_seen' => now()->timestamp,
        ]);

        $now = now()->timestamp;
        $data['requests_1min']++;
        $data['requests_5min']++;
        $data['endpoints_1min'][] = $request->path();

        // Track errors (4xx, 5xx) - will be updated after response
        // We use a deferred approach via terminable middleware or response callback

        Cache::put($key, $data, 300); // 5 min TTL
    }

    protected function checkThresholds(string $key, string $ip, Request $request): array
    {
        $data = Cache::get($key, []);
        $alerts = [];

        if (($data['requests_1min'] ?? 0) > self::THRESHOLDS['requests_per_minute']) {
            $alerts[] = "High request rate: {$data['requests_1min']} req/min from {$ip}";
        }

        if (($data['requests_5min'] ?? 0) > self::THRESHOLDS['requests_per_5min']) {
            $alerts[] = "Sustained high traffic: {$data['requests_5min']} req/5min from {$ip}";
        }

        $uniqueEndpoints = count(array_unique($data['endpoints_1min'] ?? []));
        if ($uniqueEndpoints > self::THRESHOLDS['unique_endpoints_per_min']) {
            $alerts[] = "Endpoint scanning detected: {$uniqueEndpoints} unique endpoints/min from {$ip}";
        }

        return $alerts;
    }

    protected function sendAlerts(array $alerts, string $ip, Request $request): void
    {
        $context = [
            'ip' => $ip,
            'user_agent' => $request->userAgent(),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'timestamp' => now()->toISOString(),
            'alerts' => $alerts,
        ];

        // Log to Laravel log (can be picked up by log aggregation)
        Log::channel('security')->warning('DDoS Alert', $context);

        // Store in DB for admin dashboard
        // \App\Models\SecurityAlert::create([...]); // If model exists

        // Optional: Email notification (configure in .env)
        // if (config('app.ddos_alert_email')) { ... }
    }
}
```

**Register in Kernel.php:**
```php
// Backend/app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        // ... existing
        \App\Http\Middleware\DdosProtectionMiddleware::class, // Add after RateLimitMiddleware
    ],
];
```

### 3.3 Enhanced Security Headers

**File:** `Backend/app/Http/Middleware/SecurityHeaders.php` (UPDATE)

```php
// Add to existing SecurityHeaders.php

// API-specific CSP (less restrictive for cross-origin API)
if ($request->is('api/*')) {
    $csp = [
        "default-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'none'",
    ];
    $response->headers->set('Content-Security-Policy', implode('; ', $csp));
    $response->headers->set('Cross-Origin-Resource-Policy', 'cross-origin');
    $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
}

// Permissions Policy for payment
$response->headers->set('Permissions-Policy', 'payment=(self), camera=(), microphone=(), geolocation=()');

// Remove server headers
$response->headers->remove('Server');
$response->headers->remove('X-Powered-By');
$response->headers->remove('X-CF-Powered-By');
```

### 3.4 Request Size Limits & Validation

**File:** `Backend/app/Http/Middleware/ValidateApiInput.php` (ADD)

```php
// Add at top of handle()
if ($request->is('api/*')) {
    // Limit request body size (1MB default)
    if ($request->getContentLength() > 1024 * 1024) {
        return response()->json(['message' => 'Request entity too large'], 413);
    }

    // Validate Content-Type for write operations
    if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
        if (!$request->isJson()) {
            return response()->json(['message' => 'Content-Type must be application/json'], 415);
        }
    }
}
```

## Configuration

**File:** `Backend/config/security.php` (NEW)

```php
<?php

return [
    'rate_limits' => [
        'cashier' => ['read' => 300, 'write' => 100],
        'inventory' => ['read' => 500, 'write' => 200],
        'owner' => ['read' => 1000, 'write' => 300],
        'guest' => ['read' => 30, 'write' => 10],
    ],
    'burst_multiplier' => [
        'cashier' => 2.0,
        'inventory' => 1.5,
        'owner' => 1.0,
        'guest' => 0.5,
    ],
    'ddos' => [
        'enabled' => env('DDOS_PROTECTION_ENABLED', true),
        'thresholds' => [
            'requests_per_minute' => env('DDOS_REQ_PER_MIN', 300),
            'requests_per_5min' => env('DDOS_REQ_PER_5MIN', 1000),
            'error_rate' => env('DDOS_ERROR_RATE', 0.5),
            'unique_endpoints_per_min' => env('DDOS_UNIQUE_ENDPOINTS', 50),
        ],
        'alert_channels' => ['log'], // 'log', 'email', 'slack'
    ],
    'request_limits' => [
        'max_body_size' => env('MAX_REQUEST_SIZE', 1024 * 1024), // 1MB
    ],
];
```

## Acceptance Criteria
- [ ] Adaptive rate limiting adjusts based on error rate behavior
- [ ] Cashier gets 2x burst during POS rush
- [ ] DDoS alerts logged to `security` channel
- [ ] No auto-blocking (alert-only mode)
- [ ] Security headers pass securityheaders.com scan
- [ ] Request size limited to 1MB for API
- [ ] Rate limit headers present on all responses

## Dependencies
- Laravel Cache (Redis recommended for production)
- Log channel configuration in `config/logging.php`

## Estimated Effort
- Adaptive rate limiting: 6 hours
- DDoS middleware: 4 hours
- Security headers: 2 hours
- Config + testing: 3 hours
**Total: ~15 hours**