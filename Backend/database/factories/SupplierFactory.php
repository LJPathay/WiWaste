<?php

namespace Database\Factories;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * `contact_number` is the only supplier column that is required and has no
 * default; the FDA/compliance fields added later are all nullable.
 *
 * @extends Factory<Supplier>
 */
class SupplierFactory extends Factory
{
    protected $model = Supplier::class;

    public function definition(): array
    {
        return [
            'supplier_name' => ucfirst(fake()->unique()->company()),
            'contact_person' => fake()->name(),
            'contact_number' => fake()->numerify('09#########'),
            'email' => fake()->unique()->companyEmail(),
            'address' => fake()->address(),
        ];
    }
}
