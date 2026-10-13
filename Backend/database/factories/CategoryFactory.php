<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * The `Category` table is PascalCase (`Category_name`) and carries no timestamps,
 * so nothing here can rely on the usual snake_case + created_at conventions.
 *
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        return [
            'Category_name' => ucfirst(fake()->unique()->words(2, true)),
            // Explicit rather than relying on the column default: Eloquent only
            // reflects what it was given, so `->create()` would otherwise leave
            // `status` null on the returned instance even though MySQL wrote 'Active'.
            'status' => 'Active',
        ];
    }

    public function archived(): static
    {
        return $this->state(fn () => ['status' => 'Archived']);
    }
}
