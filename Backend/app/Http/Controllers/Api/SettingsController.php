<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        $all = Setting::pluck('value', 'key');
        return response()->json($all);
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

        return response()->json(['message' => 'Settings updated.']);
    }
}
