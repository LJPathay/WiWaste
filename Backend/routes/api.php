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
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\PayMongoController;
use App\Http\Controllers\Api\ProfitLossController;
use App\Http\Controllers\Api\InventoryAnalyticsController;
use App\Http\Controllers\Api\FEFOController;
use App\Http\Controllers\Api\RecommendationController;
use App\Http\Controllers\Api\ForecastController;
use App\Http\Controllers\Api\LossPredictionController;
use App\Http\Controllers\Api\OptimizationController;

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
Route::post('/users/{id}/quarantine',  [UserController::class, 'quarantine']);
Route::post('/users/{id}/reactivate',  [UserController::class, 'reactivate']);

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
Route::get('/sales/{id}', [SalesTransactionController::class, 'show']);
Route::post('/sales', [SalesTransactionController::class, 'store']);

// PayMongo
Route::post('/paymongo/webhook', [PayMongoController::class, 'webhook']);
Route::get('/paymongo/status/{transaction_id}', [PayMongoController::class, 'status']);

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

// Purchase Orders
Route::get('/purchase-orders',             [PurchaseOrderController::class, 'index']);
Route::post('/purchase-orders',            [PurchaseOrderController::class, 'store']);
Route::get('/purchase-orders/{id}',        [PurchaseOrderController::class, 'show']);
Route::put('/purchase-orders/{id}',        [PurchaseOrderController::class, 'update']);
Route::post('/purchase-orders/{id}/receive',[PurchaseOrderController::class, 'receive']);

// Audit Logs
Route::get('/audit-logs', [AuditLogController::class, 'index']);

// Profit & Loss
Route::prefix('/profit-loss')->group(function () {
    Route::get('/overview',     [ProfitLossController::class, 'overview']);
    Route::get('/by-category',  [ProfitLossController::class, 'byCategory']);
    Route::get('/trends',       [ProfitLossController::class, 'trends']);
});

// Inventory Analytics
Route::get('/analytics/turnover',         [InventoryAnalyticsController::class, 'turnover']);
Route::get('/analytics/overstock',        [InventoryAnalyticsController::class, 'overstock']);
Route::get('/analytics/dead-stock',       [InventoryAnalyticsController::class, 'deadStock']);
Route::get('/analytics/dashboard-summary',[InventoryAnalyticsController::class, 'dashboardSummary']);

// FEFO Tracking
Route::get('/fefo/batches',       [FEFOController::class, 'batches']);
Route::get('/fefo/batches/{id}',  [FEFOController::class, 'show']);
Route::post('/fefo/apply',        [FEFOController::class, 'apply']);

// Recommendations
Route::get('/recommendations',                [RecommendationController::class, 'index']);
Route::get('/recommendations/{id}',           [RecommendationController::class, 'show']);
Route::post('/recommendations/{id}/approve',  [RecommendationController::class, 'approve']);
Route::post('/recommendations/{id}/reject',   [RecommendationController::class, 'reject']);

// Single-inventory movement history
Route::get('/inventory/{id}/movements', [InventoryController::class, 'movements']);

// Forecast (Sprint 2) — ARIMA demand predictions from the Python ML service
Route::prefix('/forecast')->group(function () {
    Route::get('/overview',     [ForecastController::class, 'overview']);
    Route::get('/{product_id}', [ForecastController::class, 'show']);
    Route::post('/generate',    [ForecastController::class, 'generate']);
});

// Loss-risk (Sprint 3) — XGBoost spoilage/shrinkage risk from the Python ML service
Route::prefix('/loss-risk')->group(function () {
    Route::post('/predict', [LossPredictionController::class, 'predict']);
    Route::get('/items',    [LossPredictionController::class, 'items']);
    Route::get('/summary',  [LossPredictionController::class, 'summary']);
});

// Optimization (Sprint 4) — GA replenishment plan from the Python ML service
Route::prefix('/optimization')->group(function () {
    Route::post('/replenishment', [OptimizationController::class, 'replenishment']);
});
