<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

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
        } else {
            // Non-API routes get full CSP
            $csp = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
                "img-src 'self' data: https: blob:",
                "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
                "connect-src 'self' https: wss:",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ];
            $response->headers->set('Content-Security-Policy', implode('; ', $csp));

            $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
            $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');
            $response->headers->set('Cross-Origin-Embedder-Policy', 'require-corp');
        }

        // Security headers for all responses
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'payment=(self), camera=(), microphone=(), geolocation=()');

        // HSTS (only in production with HTTPS)
        if (config('app.env') === 'production' && $request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        // Remove server headers
        $response->headers->remove('Server');
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('X-CF-Powered-By');

        return $response;
    }
}
