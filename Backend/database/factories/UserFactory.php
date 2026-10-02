<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * Passwords are hashed with bcrypt at BCRYPT_ROUNDS=4 under phpunit, so a
     * single pre-hashed value is reused across the suite.
     */
    protected static ?string $password = null;

    public function definition(): array
    {
        $first = fake()->firstName();
        $last = fake()->lastName();

        return [
            'first_name'     => $first,
            'middle_name'    => null,
            'surname'        => $last,
            'contact_number' => fake()->numerify('09#########'),
            'username'       => Str::lower(Str::random(8)) . fake()->unique()->numberBetween(1, 999999),
            'password'       => static::$password ??= Hash::make('password'),
            'email'          => fake()->unique()->safeEmail(),
            'role'           => 'Inventory',
            'status'         => 'Active',
            'Created_at'     => now(),
        ];
    }

    public function role(string $role): static
    {
        return $this->state(fn () => ['role' => $role]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['status' => 'Inactive']);
    }

    public function quarantined(): static
    {
        return $this->state(fn () => ['status' => 'Quarantined']);
    }
}