<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateApiInput
{
    public function handle(Request $request, Closure $next): Response
    {
        // Only apply to API routes
        if (! $request->is('api/*')) {
            return $next($request);
        }

        // Limit request body size (1MB)
        $maxSize = 1024 * 1024; // 1MB
        if ($request->getContentLength() > $maxSize) {
            return response()->json(['message' => 'Request entity too large. Maximum size is 1MB.'], 413);
        }

        // Validate Content-Type for write operations
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            $contentType = $request->header('Content-Type');

            // Allow form data for file uploads, but require JSON for API calls
            if ($contentType && ! $this->isValidContentType($contentType)) {
                return response()->json([
                    'message' => 'Content-Type must be application/json for API write requests.',
                ], 415);
            }
        }

        return $next($request);
    }

    protected function isValidContentType(string $contentType): bool
    {
        $validTypes = [
            'application/json',
            'application/x-www-form-urlencoded',
            'multipart/form-data',
        ];

        // Extract MIME type (ignore charset etc.)
        $mimeType = explode(';', $contentType)[0];

        return in_array(strtolower(trim($mimeType)), $validTypes);
    }
}
