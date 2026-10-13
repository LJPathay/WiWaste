<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StandardApiResponse;
use App\Http\Controllers\Controller;

/**
 * Base API Controller
 * Provides standard API response methods.
 */
class BaseApiController extends Controller
{
    use StandardApiResponse;
}
