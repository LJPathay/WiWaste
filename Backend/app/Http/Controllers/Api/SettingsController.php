<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingsController extends Controller
{
    public function index()
    {
        return response()->json(Cache::remember('settings.all', 3600, function () {
            return Setting::pluck('value', 'key');
        }));
    }

    public function update(Request $request)
    {
        $data = $request->all();

        foreach ($data as $key => $value) {
            if (is_string($key)) {
                Setting::updateOrCreate(
                    ['key' => $key],
                    ['value' => is_string($value) ? $value : json_encode($value)]
                );
            }
        }

        Cache::forget('settings.all');

        return response()->json(['message' => 'Settings updated.']);
    }
}
