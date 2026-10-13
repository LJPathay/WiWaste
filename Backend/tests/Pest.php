<?php

use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Closure-based (Pest) tests inherit the application's TestCase, so they run
| against the real HTTP kernel, Sanctum and the MySQL test connection. Each
| file opts into the traits it needs — `uses(RefreshDatabase::class);` — rather
| than getting them here, so a test only pays for the migrations it uses.
|
| The class-based suites (InventorySyncTest, PolicyTest, PasswordResetOtpTest, …)
| declare `extends TestCase` themselves and are picked up unchanged: Pest runs
| plain PHPUnit test cases alongside its own.
|
*/

pest()->extend(TestCase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| `expect()` extensions shared by every Pest file live here.
|
*/
