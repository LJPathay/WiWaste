<?php

namespace Database\Factories;

use App\Models\SalesTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A completed POS transaction.
 *
 * Line items live in Sales_Item and are intentionally *not* created here: the POS
 * endpoint writes them itself, and tests that need items build them through the
 * API so the stock ledger is kept in step.
 *
 * @extends Factory<SalesTransaction>
 */
class SalesTransactionFactory extends Factory
{
    protected $model = SalesTransaction::class;

    public function definition(): array
    {
        $total = fake()->randomFloat(2, 50, 2000);

        return [
            'user_id' => User::factory(),
            'total_amount' => $total,
            'transaction_date' => now()->subMinutes(fake()->numberBetween(1, 600)),
            'payment_method' => fake()->randomElement(['Cash', 'E-wallet', 'Credit Card', 'Debit Card']),
            'amount_tendered' => $total,
            'change_due' => 0,
            'status' => 'Completed',
        ];
    }

    public function voided(): static
    {
        return $this->state(fn () => ['status' => 'Voided']);
    }
}
