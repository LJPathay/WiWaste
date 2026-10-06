<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Builds a sellable SKU with its own category and supplier.
 *
 * The model generates a SKU from the barcode when none is given, but a stable,
 * unique barcode is easier to assert against in API tests than the generated one.
 *
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'supplier_id' => Supplier::factory(),
            'barcode' => 'SKU-'.fake()->unique()->numerify('######'),
            'product_name' => ucfirst(fake()->unique()->words(3, true)),
            'cost_price' => fake()->randomFloat(2, 5, 50),
            'selling_price' => fake()->randomFloat(2, 10, 100),
            'reorder_level' => fake()->numberBetween(5, 50),
            'expiration_date' => now()->addMonths(fake()->numberBetween(3, 24))->toDateString(),
            'status' => 'Active',
            'product_classification' => fake()->randomElement(['food', 'drug', 'cosmetic', 'device', 'general']),
        ];
    }

    public function discontinued(): static
    {
        return $this->state(fn () => ['status' => 'Discontinued']);
    }
}
