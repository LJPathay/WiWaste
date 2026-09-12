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
use App\Http\Controllers\Api\ProfitLossController;
use App\Http\Controllers\Api\InventoryAnalyticsController;
use App\Http\Controllers\Api\FEFOController;
use App\Http\Controllers\Api\RecommendationController;
use App\Http\Controllers\Api\ForecastController;
use App\Http\Controllers\Api\LossPredictionController;
use App\Http\Controllers\Api\OptimizationController;
use App\Http\Controllers\Api\CycleCountController;
use App\Http\Controllers\Api\VendorReturnController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ForecastAccuracyController;
use App\Http\Controllers\Api\StockReceivingController;

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
Route::get('/inventory/movements',   [InventoryController::class, 'allMovements']);

// Stock Receiving (PO-based receiving)
Route::get('/stock-receiving',                       [StockReceivingController::class, 'index']);
Route::post('/stock-receiving',                      [StockReceivingController::class, 'store']);
Route::post('/stock-receiving/{id}/receive',         [StockReceivingController::class, 'receive']);
Route::post('/stock-receiving/{id}/reject',          [StockReceivingController::class, 'reject']);
Route::post('/stock-receiving/{id}/discard',         [StockReceivingController::class, 'discard']);

// Wastage
Route::get('/wastage',  [WastageRecordController::class, 'index']);
Route::post('/wastage', [WastageRecordController::class, 'store']);

// Health Check
Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'laravel']));

// Sales / POS
Route::get('/sales',  [SalesTransactionController::class, 'index']);
Route::get('/sales/{id}', [SalesTransactionController::class, 'show']);
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
Route::get('/dashboard/owner-analytics', [DashboardController::class, 'ownerAnalytics']);

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

// ── New process flow endpoints (Phase 2.3) ──

// Cycle Count
Route::post('/inventory/cycle-count', [CycleCountController::class, 'store']);

// Vendor Returns
Route::post('/vendor-returns/{id}/receive', [VendorReturnController::class, 'receive']);
Route::post('/vendor-returns/{id}/credit',  [VendorReturnController::class, 'credit']);

// Shifts
Route::post('/shifts/open',  [ShiftController::class, 'open']);
Route::post('/shifts/close', [ShiftController::class, 'close']);

// Alerts
Route::get('/alerts/expiring', [AlertController::class, 'expiring']);

// Returns approval
Route::post('/returns/{id}/approve', [ReturnTransactionController::class, 'approve']);

// Notifications
Route::get('/notifications',              [NotificationController::class, 'index']);
Route::post('/notifications/{id}/read',   [NotificationController::class, 'markRead']);
Route::post('/notifications/read-all',    [NotificationController::class, 'markAllRead']);

// ML Accuracy Tracking
Route::post('/ml/accuracy',               [ForecastAccuracyController::class, 'store']);
Route::get('/ml/accuracy/alerts',         [ForecastAccuracyController::class, 'alerts']);
Route::get('/ml/accuracy/{product_id}',   [ForecastAccuracyController::class, 'show']);
