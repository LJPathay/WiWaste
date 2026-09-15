<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        // Skip for local development
        if (app()->environment('local', 'testing')) {
            return $next($request);
        }

        // Check if already HTTPS or forwarded via proxy
        if (!$request->isSecure() && !$request->header('X-Forwarded-Proto')) {
            return redirect()->secure($request->getRequestUri(), 301);
        }

        // If behind proxy, check X-Forwarded-Proto header
        if ($request->header('X-Forwarded-Proto') !== 'https') {
            return redirect()->secure($request->getRequestUri(), 301);
        }

        return $next($request);
    }
}