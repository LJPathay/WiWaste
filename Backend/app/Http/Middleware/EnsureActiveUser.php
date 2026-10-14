<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
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
            return $request->is('api/me', 'api/products', 'api/products/lookup/*', 'api/categories', 'api/sales', 'api/sales/*', 'api/returns', 'api/returns/*');
        }

        return $request->isMethod('POST') && $request->is('api/logout', 'api/sales', 'api/returns', 'api/shifts/open', 'api/shifts/close');
    }
}
