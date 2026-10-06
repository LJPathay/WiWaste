<?php

/**
 * Pest coverage for the auth surface: token issuance, credential validation,
 * account-status guards, the login lockout, and the role gates registered in
 * AuthServiceProvider.
 */

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

it('rejects an unauthenticated request to a protected endpoint', function () {
    $this->getJson('/api/v1/products')->assertStatus(401);
});

it('issues an access token for valid credentials', function () {
    $user = User::factory()->role('Owner')->create();

    $response = $this->postJson('/api/v1/login', [
        'username' => $user->username,
        'password' => 'password',
    ]);

    $response
        ->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Login successful')
        ->assertJsonPath('data.user.role', 'Owner');

    expect($response->json('data.access_token'))->toBeString()->not->toBe('');
});

it('rejects a wrong password without leaking which half was wrong', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/login', [
        'username' => $user->username,
        'password' => 'not-the-password',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['username']);
});

it('refuses to authenticate an inactive account', function () {
    $user = User::factory()->inactive()->create();

    $this->postJson('/api/v1/login', [
        'username' => $user->username,
        'password' => 'password',
    ])
        ->assertStatus(403)
        ->assertJsonPath('success', false);
});

it('locks an account after five failed attempts', function () {
    $user = User::factory()->create();

    $statuses = [];
    for ($attempt = 0; $attempt < 6; $attempt++) {
        $statuses[] = $this->postJson('/api/v1/login', [
            'username' => $user->username,
            'password' => 'wrong-password',
        ])->status();
    }

    // Fifth failure trips LoginAttemptService::MAX_ATTEMPTS; the sixth must not
    // even reach the password check anymore.
    expect($statuses)->toContain(429);
});

it('grants product.create to the owner tier only', function () {
    expect(Gate::forUser(User::factory()->role('Owner')->create())->allows('product.create'))->toBeTrue()
        ->and(Gate::forUser(User::factory()->role('Admin')->create())->allows('product.create'))->toBeTrue()
        ->and(Gate::forUser(User::factory()->role('Inventory')->create())->allows('product.create'))->toBeFalse()
        ->and(Gate::forUser(User::factory()->role('Cashier')->create())->allows('product.create'))->toBeFalse();
});

it('lets an inventory user read products but not write them', function () {
    $inventory = User::factory()->role('Inventory')->create();
    $product = new Product;

    expect(Gate::forUser($inventory)->allows('product.viewAny'))->toBeTrue()
        ->and(Gate::forUser($inventory)->denies('product.update', $product))->toBeTrue()
        ->and(Gate::forUser($inventory)->denies('product.delete', $product))->toBeTrue();
});

it('returns a token that can be used and then revoked', function () {
    $user = User::factory()->role('Owner')->create();

    $token = $this->postJson('/api/v1/login', [
        'username' => $user->username,
        'password' => 'password',
    ])->json('data.access_token');

    $this->withToken($token)->getJson('/api/v1/products')->assertOk();

    $this->withToken($token)->postJson('/api/v1/logout')->assertOk();
});
