<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS)
    |--------------------------------------------------------------------------
    |
    | The SPA and the API run on different ports in development (5173 -> 8000),
    | which is cross-origin. Session renewal relies on an HttpOnly refresh
    | cookie, and browsers only store and send that cookie when the response
    | explicitly allows credentials with a named origin. `allowed_origins`
    | cannot be `*` in that case.
    |
    | Deployed origins can be supplied as a comma-separated list through
    | CORS_ALLOWED_ORIGINS; loopback addresses are always allowed so any local
    | dev port keeps working.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'CORS_ALLOWED_ORIGINS',
            'http://localhost:8000,http://127.0.0.1:8000'
        ))
    ))),

    'allowed_origins_patterns' => [
        '#^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
