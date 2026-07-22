<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\WastageRecordController;
use App\Http\Controllers\Api\SalesTransactionController;
use App\Http\Controllers\Api\ReturnTransactionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\DashboardController;

/*
|--------------------------------------------------------------------------
| WiWaste API Routes
|--------------------------------------------------------------------------
| Open access for development/prototyping across all roles & transactions.
*/

// Auth
Route::post('/login',  [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/me',      [AuthController::class, 'me']);

// User management
Route::apiResource('/users', UserController::class);

// Lookup tables
Route::apiResource('/categories', CategoryController::class);
Route::apiResource('/suppliers',  SupplierController::class);

// Products
Route::apiResource('/products', ProductController::class);
Route::get('/products/lookup/{code}', [ProductController::class, 'lookup']);

// Inventory
Route::get('/inventory',             [InventoryController::class, 'index']);
Route::post('/inventory/stock-in',   [InventoryController::class, 'stockIn']);
Route::post('/inventory/stock-out',  [InventoryController::class, 'stockOut']);

// Wastage
Route::get('/wastage',  [WastageRecordController::class, 'index']);
Route::post('/wastage', [WastageRecordController::class, 'store']);

// Sales / POS
Route::get('/sales',  [SalesTransactionController::class, 'index']);
Route::post('/sales', [SalesTransactionController::class, 'store']);

// Returns & Refunds
Route::get('/returns',  [ReturnTransactionController::class, 'index']);
Route::post('/returns', [ReturnTransactionController::class, 'store']);

// Reports
Route::prefix('/reports')->group(function () {
    Route::get('/waste-summary',       [ReportController::class, 'wasteSummary']);
    Route::get('/inventory-movement',  [ReportController::class, 'inventoryMovement']);
    Route::get('/supplier-performance',[ReportController::class, 'supplierPerformance']);
    Route::get('/expiry-analysis',     [ReportController::class, 'expiryAnalysis']);
    Route::get('/category-analysis',   [ReportController::class, 'categoryAnalysis']);
    Route::get('/cost-impact',         [ReportController::class, 'costImpact']);
});

// Settings
Route::get('/settings',  [SettingsController::class, 'index']);
Route::put('/settings',  [SettingsController::class, 'update']);

// Dashboard
Route::get('/dashboard/overview', [DashboardController::class, 'overview']);
