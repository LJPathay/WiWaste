<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\EmailDeliverySettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    public function index()
    {
        return response()->json(Cache::remember('settings.all', 3600, function () {
            return Setting::where('key', 'not like', 'email.%')->pluck('value', 'key');
        }));
    }

    public function update(Request $request)
    {
        abort_unless($request->user()?->canManageUsers(), 403, 'Only an owner or administrator can update settings.');
        $data = $request->all();

        foreach (array_keys($data) as $key) {
            if (is_string($key) && (str_starts_with(strtolower($key), 'email.') || strlen($key) > 100)) {
                throw ValidationException::withMessages(['settings' => ['Email delivery settings must be changed through the owner email settings page. Keys must not exceed 100 characters.']]);
            }
        }

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

    public function email(Request $request, EmailDeliverySettings $settings): JsonResponse
    {
        abort_unless($request->user()?->canManageUsers(), 403, 'Only an owner or administrator can view email settings.');

        return response()->json($settings->publicSettings());
    }

    public function updateEmail(Request $request, EmailDeliverySettings $settings): JsonResponse
    {
        abort_unless($request->user()?->canManageUsers(), 403, 'Only an owner or administrator can update email settings.');
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'host' => ['nullable', 'string', 'max:255', 'required_if:enabled,true', 'regex:/^[a-zA-Z0-9][a-zA-Z0-9.\-]*$/'],
            'port' => ['required', 'integer', 'between:1,65535'],
            'encryption' => ['required', Rule::in(['tls', 'ssl', 'none'])],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['sometimes', 'nullable', 'string', 'max:1024'],
            'from_address' => ['nullable', 'required_if:enabled,true', 'email', 'max:100'],
            'from_name' => ['nullable', 'required_if:enabled,true', 'string', 'max:100'],
        ]);
        $data['host'] = $data['host'] ?? '';
        $data['username'] = $data['username'] ?? '';
        $result = $settings->save($data);
        Cache::forget('settings.all');

        return response()->json($result);
    }
}
