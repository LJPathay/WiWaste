<?php

use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CycleCountController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DataRetentionPolicyController;
use App\Http\Controllers\Api\FEFOController;
use App\Http\Controllers\Api\ForecastAccuracyController;
use App\Http\Controllers\Api\ForecastController;
use App\Http\Controllers\Api\InventoryAnalyticsController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\LossPredictionController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OptimizationController;
use App\Http\Controllers\Api\PrivacyComplianceController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProfitLossController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\RecallController;
use App\Http\Controllers\Api\RecommendationController;
use App\Http\Controllers\Api\ReorderController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReturnTransactionController;
use App\Http\Controllers\Api\SalesTransactionController;
use App\Http\Controllers\Api\SalesWastageDashboardController;
use App\Http\Controllers\Api\SanitationController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\StockCountController;
use App\Http\Controllers\Api\StockReceivingController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VendorReturnController;
use App\Http\Controllers\Api\WastageFlagController;
use App\Http\Controllers\Api\WastageRecordController;
use Illuminate\Support\Facades\Route;

/**
 * Every API route, mounted twice: once under /api/v1 (the versioned surface the
 * frontend talks to) and once unprefixed for legacy clients.
 *
 * This used to be a hand-copied duplicate of the same ~470 lines. The copies drifted,
 * which is what let literal segments like suppliers/alerts and
ecalls/summary be
 * shadowed by the {param} routes declared above them in one copy but not the other.
 * One definition, registered twice, cannot drift.
 */
return function (): void {
    // Auth — these must stay reachable without a token.
    Route::post('/login', [AuthController::class, 'login'])->withoutMiddleware('auth:sanctum');
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/refresh', [AuthController::class, 'refresh']);

    // Password Reset (no auth required)
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->withoutMiddleware('auth:sanctum');
    Route::post('/password/verify-otp', [AuthController::class, 'verifyOtp'])->withoutMiddleware('auth:sanctum');
    Route::post('/password/reset', [AuthController::class, 'resetPassword'])->withoutMiddleware('auth:sanctum');

    // Health check is polled by uptime monitors
    Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'laravel', 'version' => '1.0.0']))->withoutMiddleware('auth:sanctum');

    // User management.
    // `GET /users/status-counts` must be declared *before* the apiResource, exactly like
    // `/suppliers/compliance` below: apiResource registers `GET /users/{user}` first, so
    // with the order reversed that parameter matched the literal segment and
    // `show('status-counts')` turned the tab counts into a 404.
    Route::get('/users/status-counts', [UserController::class, 'statusCounts']);
    Route::apiResource('/users', UserController::class);
    Route::post('/users/{id}/quarantine', [UserController::class, 'quarantine']);
    Route::post('/users/{id}/reactivate', [UserController::class, 'reactivate']);
    Route::post('/users/{id}/archive', [UserController::class, 'archive']);

    // Lookup tables
    Route::apiResource('/categories', CategoryController::class);
    // These must be declared *before* the apiResource: `suppliers/{supplier}` would
    // otherwise match "compliance" and "alerts" as a supplier id.
    Route::get('/suppliers/compliance', [SupplierController::class, 'compliance']);
    Route::get('/suppliers/alerts', [SupplierController::class, 'alerts']);
    Route::apiResource('/suppliers', SupplierController::class);

    // Products
    Route::apiResource('/products', ProductController::class);
    Route::get('/products/lookup/{code}', [ProductController::class, 'lookup']);
    Route::get('/products/{id}/label', [ProductController::class, 'label']);

    // Inventory
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory/stock-in', [InventoryController::class, 'stockIn']);
    Route::post('/inventory/stock-out', [InventoryController::class, 'stockOut']);
    Route::post('/inventory/receive', [InventoryController::class, 'receive']);
    Route::get('/inventory/near-expiry', [InventoryController::class, 'nearExpiry']);
    Route::get('/inventory/movements', [InventoryController::class, 'allMovements']);

    // Stock Counts (cycle count)
    Route::get('/stock-counts', [StockCountController::class, 'index']);
    Route::post('/stock-counts', [StockCountController::class, 'store']);
    Route::post('/stock-counts/{id}/approve', [StockCountController::class, 'approve']);
    Route::post('/stock-counts/{id}/reject', [StockCountController::class, 'reject']);

    // Stock Receiving (PO-based receiving)
    Route::get('/stock-receiving', [StockReceivingController::class, 'index']);
    Route::post('/stock-receiving', [StockReceivingController::class, 'store']);
    Route::post('/stock-receiving/{id}/receive', [StockReceivingController::class, 'receive']);
    Route::post('/stock-receiving/{id}/reject', [StockReceivingController::class, 'reject']);
    Route::post('/stock-receiving/{id}/discard', [StockReceivingController::class, 'discard']);

    // Wastage
    Route::get('/wastage', [WastageRecordController::class, 'index']);
    Route::post('/wastage', [WastageRecordController::class, 'store']);

    // Wastage Flags (Cashier flag → Inventory confirm)
    Route::get('/wastage-flags', [WastageFlagController::class, 'index']);
    Route::post('/wastage-flags', [WastageFlagController::class, 'store']);
    Route::post('/wastage-flags/{id}/confirm', [WastageFlagController::class, 'confirm']);
    Route::post('/wastage-flags/{id}/reject', [WastageFlagController::class, 'reject']);

    // Sales / POS
    Route::get('/sales', [SalesTransactionController::class, 'index']);
    Route::get('/sales/{id}', [SalesTransactionController::class, 'show']);
    Route::post('/sales', [SalesTransactionController::class, 'store']);
    Route::get('/sales/{id}/receipt', [SalesTransactionController::class, 'receipt']);

    // Returns & Refunds
    Route::get('/returns', [ReturnTransactionController::class, 'index']);
    Route::post('/returns', [ReturnTransactionController::class, 'store']);
    Route::post('/returns/{id}/approve', [ReturnTransactionController::class, 'approve']);
    Route::post('/returns/{id}/reject', [ReturnTransactionController::class, 'reject']);
    Route::get('/returns/{id}', [ReturnTransactionController::class, 'show']);

    // Reports
    Route::prefix('/reports')->group(function () {
        Route::get('/waste-summary', [ReportController::class, 'wasteSummary']);
        Route::get('/inventory-movement', [ReportController::class, 'inventoryMovement']);
        Route::get('/supplier-performance', [ReportController::class, 'supplierPerformance']);
        Route::get('/expiry-analysis', [ReportController::class, 'expiryAnalysis']);
        Route::get('/category-analysis', [ReportController::class, 'categoryAnalysis']);
        Route::get('/cost-impact', [ReportController::class, 'costImpact']);
        // Sprint 4: Sales Reports
        Route::get('/sales-vat-summary', [ReportController::class, 'salesVatSummary']);
        Route::get('/discount-summary', [ReportController::class, 'discountSummary']);
        Route::get('/senior-pwd-log', [ReportController::class, 'seniorPwdTransactionLog']);
    });

    // Settings
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::put('/settings', [SettingsController::class, 'update']);

    // Dashboard
    Route::get('/dashboard/overview', [DashboardController::class, 'overview']);
    Route::get('/dashboard/owner-analytics', [DashboardController::class, 'ownerAnalytics']);

    // Sales vs Wastage Dashboard (Owner only)
    Route::prefix('/sales-wastage')->group(function () {
        Route::get('/overview', [SalesWastageDashboardController::class, 'overview']);
        Route::get('/time-series', [SalesWastageDashboardController::class, 'timeSeries']);
        Route::get('/export', [SalesWastageDashboardController::class, 'exportCsv']);
        Route::get('/flags-summary', [SalesWastageDashboardController::class, 'flagSummary']);
    });

    // Purchase Orders
    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store']);
    Route::get('/purchase-orders/{id}', [PurchaseOrderController::class, 'show']);
    Route::put('/purchase-orders/{id}', [PurchaseOrderController::class, 'update']);
    Route::post('/purchase-orders/{id}/receive', [PurchaseOrderController::class, 'receive']);

    // Reorder Suggestions
    Route::get('/reorder/suggestions', [ReorderController::class, 'index']);
    Route::post('/reorder/approve', [ReorderController::class, 'approve']);
    Route::post('/reorder/auto-approve', [ReorderController::class, 'autoApprove']);

    // Audit Logs
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // Profit & Loss
    Route::prefix('/profit-loss')->group(function () {
        Route::get('/overview', [ProfitLossController::class, 'overview']);
        Route::get('/by-category', [ProfitLossController::class, 'byCategory']);
        Route::get('/trends', [ProfitLossController::class, 'trends']);
    });

    // Inventory Analytics
    Route::get('/analytics/turnover', [InventoryAnalyticsController::class, 'turnover']);
    Route::get('/analytics/overstock', [InventoryAnalyticsController::class, 'overstock']);
    Route::get('/analytics/dead-stock', [InventoryAnalyticsController::class, 'deadStock']);
    Route::get('/analytics/dashboard-summary', [InventoryAnalyticsController::class, 'dashboardSummary']);

    // FEFO Tracking
    Route::get('/fefo/batches', [FEFOController::class, 'batches']);
    Route::get('/fefo/batches/{id}', [FEFOController::class, 'show']);
    Route::post('/fefo/apply', [FEFOController::class, 'apply']);
    Route::get('/fefo/batches/{id}/trace', [FEFOController::class, 'trace']);

    // Recommendations
    Route::get('/recommendations', [RecommendationController::class, 'index']);
    Route::get('/recommendations/{id}', [RecommendationController::class, 'show']);
    Route::post('/recommendations/{id}/approve', [RecommendationController::class, 'approve']);
    Route::post('/recommendations/{id}/reject', [RecommendationController::class, 'reject']);

    // Single-inventory movement history
    Route::get('/inventory/{id}/movements', [InventoryController::class, 'movements']);

    // Forecast (Sprint 2) — ARIMA demand predictions from the Python ML service
    Route::prefix('/forecast')->group(function () {
        Route::get('/overview', [ForecastController::class, 'overview']);
        Route::get('/{product_id}', [ForecastController::class, 'show']);
        Route::post('/generate', [ForecastController::class, 'generate']);
    });

    // Loss-risk (Sprint 3) — XGBoost spoilage/shrinkage risk from the Python ML service
    Route::prefix('/loss-risk')->group(function () {
        Route::post('/predict', [LossPredictionController::class, 'predict']);
        Route::get('/items', [LossPredictionController::class, 'items']);
        Route::get('/summary', [LossPredictionController::class, 'summary']);
    });

    // Optimization (Sprint 4) — GA replenishment plan from the Python ML service
    Route::prefix('/optimization')->group(function () {
        Route::post('/replenishment', [OptimizationController::class, 'replenishment']);
    });

    // ── New process flow endpoints (Phase 2.3) ──

    // Cycle Count
    Route::post('/inventory/cycle-count', [CycleCountController::class, 'store']);

    // Vendor Returns
    // `summary` is literal and must precede the apiResource's `vendor-returns/{vendor_return}`.
    Route::get('/vendor-returns/summary', [VendorReturnController::class, 'summary']);
    Route::apiResource('/vendor-returns', VendorReturnController::class);
    Route::post('/vendor-returns/{id}/approve', [VendorReturnController::class, 'approve']);
    Route::post('/vendor-returns/{id}/reject', [VendorReturnController::class, 'reject']);
    Route::post('/vendor-returns/{id}/ship', [VendorReturnController::class, 'ship']);
    Route::post('/vendor-returns/{id}/receive', [VendorReturnController::class, 'receive']);
    Route::post('/vendor-returns/{id}/credit', [VendorReturnController::class, 'credit']);

    // Shifts
    Route::post('/shifts/open', [ShiftController::class, 'open']);
    Route::post('/shifts/close', [ShiftController::class, 'close']);

    // Alerts
    Route::get('/alerts/expiring', [AlertController::class, 'expiring']);
    Route::get('/alerts/summary', [AlertController::class, 'summary']);

    // Sanitation Checklist
    Route::get('/sanitation', [SanitationController::class, 'index']);
    Route::post('/sanitation', [SanitationController::class, 'store']);
    Route::get('/sanitation/summary', [SanitationController::class, 'summary']);
    Route::get('/sanitation/{id}', [SanitationController::class, 'show']);
    Route::put('/sanitation/{id}', [SanitationController::class, 'update']);
    Route::post('/sanitation/{id}/verify', [SanitationController::class, 'verify']);

    // Recall Management
    Route::get('/recalls', [RecallController::class, 'index']);
    Route::post('/recalls', [RecallController::class, 'store']);
    Route::get('/recalls/summary', [RecallController::class, 'summary']);
    Route::get('/recalls/{id}', [RecallController::class, 'show']);
    Route::put('/recalls/{id}', [RecallController::class, 'update']);
    Route::post('/recalls/{id}/activate', [RecallController::class, 'activate']);
    Route::post('/recalls/{id}/quarantine', [RecallController::class, 'quarantine']);
    Route::post('/recalls/{id}/notify', [RecallController::class, 'notify']);
    Route::post('/recalls/{id}/resolve', [RecallController::class, 'resolve']);

    // Returns approval
    Route::post('/returns/{id}/approve', [ReturnTransactionController::class, 'approve']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // ML Accuracy Tracking
    Route::post('/ml/accuracy', [ForecastAccuracyController::class, 'store']);
    Route::get('/ml/accuracy/alerts', [ForecastAccuracyController::class, 'alerts']);
    Route::get('/ml/accuracy/{product_id}', [ForecastAccuracyController::class, 'show']);

    // Webhook Framework (placeholder - controller not yet implemented)
    // Route::post('/webhooks/{provider}', [WebhookController::class, 'handle']);

    // Data Retention Policies
    // `logs` is a literal segment and must precede `retention-policies/{id}`, which would
    // otherwise swallow it as an id.
    Route::get('/retention-policies/logs', [DataRetentionPolicyController::class, 'purgeLogs']);
    Route::apiResource('/retention-policies', DataRetentionPolicyController::class);
    Route::post('/retention-policies/{id}/execute', [DataRetentionPolicyController::class, 'executePurge']);
    Route::get('/retention-policies/{id}/preview', [DataRetentionPolicyController::class, 'previewPurge']);

    // ── Privacy / compliance ────────────────────────────────────────────────
    // The admin compliance pages call `privacy.*` in `services/api.ts`, which all live
    // under a `/privacy` prefix. None of these paths existed, so every request from
    // Data Subject Requests / Breach Incidents / Data Retention 404'd and those pages
    // rendered empty. Literal segments are declared before their `{param}` siblings.
    Route::prefix('privacy')->group(function () {
        Route::get('/compliance-report', [PrivacyComplianceController::class, 'complianceReport']);

        Route::get('/requests', [PrivacyComplianceController::class, 'requests']);
        Route::post('/requests', [PrivacyComplianceController::class, 'createRequest']);
        Route::post('/requests/{id}/approve', [PrivacyComplianceController::class, 'approveRequest']);
        Route::post('/requests/{id}/reject', [PrivacyComplianceController::class, 'rejectRequest']);
        Route::delete('/requests/{id}', [PrivacyComplianceController::class, 'deleteRequest']);

        Route::get('/breaches/statistics', [PrivacyComplianceController::class, 'breachStatistics']);
        Route::get('/breaches', [PrivacyComplianceController::class, 'breaches']);
        Route::post('/breaches', [PrivacyComplianceController::class, 'createBreach']);
        Route::post('/breaches/{id}/escalate', [PrivacyComplianceController::class, 'escalateBreach']);
        Route::post('/breaches/{id}/notify-npc', [PrivacyComplianceController::class, 'notifyNPC']);
        Route::post('/breaches/{id}/notify-subjects', [PrivacyComplianceController::class, 'notifySubjects']);
        Route::post('/breaches/{id}/contain', [PrivacyComplianceController::class, 'containBreach']);
        Route::post('/breaches/{id}/resolve', [PrivacyComplianceController::class, 'resolveBreach']);

        // The Data Retention page uses the same prefix as the top-level resource.
        Route::get('/retention-policies/summary', [DataRetentionPolicyController::class, 'retentionSummary']);
        Route::get('/retention-policies/logs', [DataRetentionPolicyController::class, 'purgeLogs']);
        Route::get('/retention-policies', [DataRetentionPolicyController::class, 'index']);
        Route::post('/retention-policies', [DataRetentionPolicyController::class, 'store']);
        Route::get('/retention-policies/{id}/preview', [DataRetentionPolicyController::class, 'previewPurge']);
        Route::post('/retention-policies/{id}/test-purge', [DataRetentionPolicyController::class, 'testPurge']);
        Route::post('/retention-policies/{id}/purge', [DataRetentionPolicyController::class, 'purgeNow']);
        Route::put('/retention-policies/{id}', [DataRetentionPolicyController::class, 'update']);
        Route::delete('/retention-policies/{id}', [DataRetentionPolicyController::class, 'destroy']);
    });
};
