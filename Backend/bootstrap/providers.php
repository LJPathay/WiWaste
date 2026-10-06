<?php

use App\Providers\AppServiceProvider;
use App\Providers\AuthServiceProvider;

return [
    AppServiceProvider::class,

    // Registers the role gates (product.create, sales.refund, fefo.clear, ...) plus
    // the Gate::before owner-tier bypass. AuthServiceProvider was never listed in
    // this file, so every Gate::define() inside it was unreachable: nothing in the
    // app — or in the tests — could actually ask for a permission.
    AuthServiceProvider::class,
];
