<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CompressResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!$this->shouldCompress($request, $response)) {
            return $response;
        }

        $content = $response->getContent();
        if ($content === null || $content === '') {
            return $response;
        }

        $compressed = gzencode($content, 6);
        if ($compressed === false) {
            return $response;
        }

        $response->setContent($compressed);
        $response->headers->set('Content-Encoding', 'gzip');
        $response->headers->set('Vary', 'Accept-Encoding');
        $response->headers->set('Content-Length', strlen((string) $compressed));

        return $response;
    }

    private function shouldCompress(Request $request, Response $response): bool
    {
        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            return false;
        }

        $acceptEncoding = $request->headers->get('Accept-Encoding', '');
        if (!str_contains($acceptEncoding, 'gzip')) {
            return false;
        }

        $contentType = $response->headers->get('Content-Type', '');
        if (!str_contains($contentType, 'json') && !str_contains($contentType, 'text') && !str_contains($contentType, 'javascript')) {
            return false;
        }

        $content = $response->getContent();
        if ($content === null || strlen($content) < 256) {
            return false;
        }

        if ($response->headers->has('Content-Encoding')) {
            return false;
        }

        return true;
    }
}
