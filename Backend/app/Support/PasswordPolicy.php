<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

class PasswordPolicy
{
    public static function rules(): array
    {
        return [
            'bail', 'required', 'string', 'max:72',
            Password::min(8)->mixedCase()->numbers()->symbols(),
            'regex:/[\p{P}\p{S}]/u',
            'not_regex:/\p{Cc}/u',
            function ($attribute, $value, $fail) {
                if (strlen($value) > 72) {
                    $fail('The password must not exceed 72 bytes.');
                }
            },
        ];
    }
}
