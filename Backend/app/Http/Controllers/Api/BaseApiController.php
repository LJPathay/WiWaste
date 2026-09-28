<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\StandardApiResponse;

/**
 * Base API Controller
 * Provides standard API response methods.
 */
class BaseApiController extends Controller
{
    use StandardApiResponse;
}