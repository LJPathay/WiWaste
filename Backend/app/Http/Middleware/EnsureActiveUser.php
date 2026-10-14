<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $path = preg_replace('#^api/v1/#', 'api/', $request->path());
        if (in_array($path, ['api/login', 'api/health', 'api/forgot-password', 'api/reset-password', 'api/password/forgot', 'api/password/reset', 'api/password/verify-otp'], true)) {
            return $next($request);
        }
        $user = $request->user();
        if (! $user || $user->status !== 'Active' || $user->getAttribute('archived_at') !== null) {
            return response()->json(['message' => 'Your account is inactive or unavailable. Contact your administrator.'], 403);
        }

        if (in_array($user->role, ['Cashier', 'Business Owner'], true) && ! $this->cashierMayAccess($request)) {
            return response()->json(['message' => 'You do not have permission to access this resource.'], 403);
        }

        return $next($request);
    }

    private function cashierMayAccess(Request $request): bool
    {
        if ($request->isMethod('GET')) {
            return Str::is(['api/me', 'api/products', 'api/products/lookup/*', 'api/categories', 'api/sales', 'api/sales/*', 'api/returns', 'api/returns/*'], preg_replace('#^api/v1/#', 'api/', $request->path()));
        }

        return $request->isMethod('POST') && Str::is(['api/logout', 'api/sales', 'api/returns', 'api/wastage-flags', 'api/shifts/open', 'api/shifts/close'], preg_replace('#^api/v1/#', 'api/', $request->path()));
    }
}
