<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class ValidateApiInput
{
    /**
     * Input validation rules by route pattern
     */
    protected array $rules = [
        'api/products' => [
            'POST' => [
                'category_id' => 'required|integer|exists:category,Category_id',
                'supplier_id' => 'required|integer|exists:supplier,supplier_id',
                'product_name' => 'required|string|max:150',
                'cost_price' => 'required|numeric|min:0|max:999999.99',
                'selling_price' => 'required|numeric|min:0|max:999999.99',
                'reorder_level' => 'required|integer|min:0|max:10000',
                'product_classification' => 'sometimes|in:food,drug,cosmetic,device,general',
                'required_temp_min' => 'nullable|numeric|between:-50,100',
                'required_temp_max' => 'nullable|numeric|between:-50,100',
                'storage_requirement' => 'sometimes|in:refrigerated,frozen,controlled_room,ambient,custom',
                'is_rx_only' => 'sometimes|boolean',
                'ddb_schedule' => 'nullable|string|max:20',
            ],
            'PUT' => [
                'category_id' => 'sometimes|integer|exists:category,Category_id',
                'supplier_id' => 'sometimes|integer|exists:supplier,supplier_id',
                'product_name' => 'sometimes|string|max:150',
                'cost_price' => 'sometimes|numeric|min:0|max:999999.99',
                'selling_price' => 'sometimes|numeric|min:0|max:999999.99',
                'reorder_level' => 'sometimes|integer|min:0|max:10000',
                'product_classification' => 'sometimes|in:food,drug,cosmetic,device,general',
                'required_temp_min' => 'nullable|numeric|between:-50,100',
                'required_temp_max' => 'nullable|numeric|between:-50,100',
                'storage_requirement' => 'sometimes|in:refrigerated,frozen,controlled_room,ambient,custom',
                'is_rx_only' => 'sometimes|boolean',
                'ddb_schedule' => 'nullable|string|max:20',
            ],
        ],
        'api/sales' => [
            'POST' => [
                'payment_method' => 'required|in:Cash,E-wallet,Credit Card,Debit Card',
                'payment_reference' => 'nullable|string|max:100',
                'amount_tendered' => 'nullable|numeric|min:0',
                'change_due' => 'nullable|numeric|min:0',
                'senior_pwd_name' => 'nullable|string|max:100',
                'senior_pwd_id' => 'nullable|string|max:50',
                'senior_pwd_type' => 'nullable|in:senior,pwd,none',
                'customer_name' => 'nullable|string|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'customer_email' => 'nullable|email|max:255',
                'items' => 'required|array|min:1',
                'items.*.product_id' => 'required|integer|exists:product,product_id',
                'items.*.quantity' => 'required|integer|min:1|max:10000',
                'items.*.unit_price' => 'required|numeric|min:0|max:999999.99',
                'items.*.discount_pct' => 'nullable|numeric|min:0|max:1',
                'items.*.discount_amount' => 'nullable|numeric|min:0|max:999999.99',
                'items.*.override_reason' => 'nullable|string|max:255',
            ],
        ],
        'api/returns' => [
            'POST' => [
                'sale_item_id' => 'required|integer|exists:sales_item,sales_item_id',
                'quantity_returned' => 'required|integer|min:1',
                'return_reason_code' => 'required|in:defective,wrong_item,change_mind,damaged,expired,missing_parts,not_as_described,other',
                'evidence_notes' => 'nullable|string|max:1000',
                'evidence_photos' => 'nullable|array',
                'evidence_photos.*' => 'nullable|url|max:500',
                'return_date' => 'required|date',
            ],
        ],
        'api/stock-receiving' => [
            'POST' => [
                'supplier_id' => 'required|integer|exists:supplier,supplier_id',
                'expected_date' => 'required|date',
                'items' => 'required|array|min:1',
                'items.*.product_id' => 'required|integer|exists:product,product_id',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.unit_cost' => 'required|numeric|min:0',
                'items.*.batch_number' => 'nullable|string|max:100',
                'items.*.expiration_date' => 'nullable|date',
            ],
        ],
        'api/purchase-orders' => [
            'POST' => [
                'supplier_id' => 'required|integer|exists:supplier,supplier_id',
                'notes' => 'nullable|string|max:1000',
                'items' => 'required|array|min:1',
                'items.*.product_id' => 'required|integer|exists:product,product_id',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.unit_price' => 'required|numeric|min:0|max:999999.99',
            ],
        ],
        'api/wastage' => [
            'POST' => [
                'product_id' => 'required|integer|exists:product,product_id',
                'wastage_type' => 'required|in:Expired,Damaged,Spoiled,Lost',
                'quantity' => 'required|integer|min:1',
                'estimated_loss' => 'required|numeric|min:0',
                'date_recorded' => 'required|date',
            ],
        ],
        'api/sanitation' => [
            'POST' => [
                'checklist_date' => 'required|date',
                'frequency' => 'required|in:daily,weekly,monthly',
                'area' => 'required|in:receiving,storage,preparation,dispensing,waste,general',
                'checks' => 'required|array|min:1',
                'checks.*.item' => 'required|string|max:255',
                'checks.*.passed' => 'required|boolean',
                'checks.*.notes' => 'nullable|string|max:500',
                'checks.*.photo_url' => 'nullable|url|max:500',
                'notes' => 'nullable|string|max:1000',
            ],
        ],
        'api/recalls' => [
            'POST' => [
                'product_id' => 'required|integer|exists:product,product_id',
                'batch_id' => 'nullable|integer|exists:fefo_batch,batch_id',
                'supplier_id' => 'nullable|integer|exists:supplier,supplier_id',
                'reason' => 'required|string|max:1000',
                'severity' => 'required|in:low,medium,high,critical',
                'affected_batches' => 'required|array|min:1',
                'affected_batches.*.batch_id' => 'required|integer|exists:fefo_batch,batch_id',
                'affected_batches.*.quantity' => 'required|integer|min:1',
                'target_resolution_date' => 'nullable|date',
            ],
        ],
    ];

    /**
     * Sanitization patterns to strip
     */
    protected array $sanitizePatterns = [
        '/<script\b[^>]*>.*?<\/script>/i',
        '/on\w+\s*=/i',
        '/javascript:/i',
        '/vbscript:/i',
        '/data:/i',
        '/<\s*iframe/i',
        '/<\s*object/i',
        '/<\s*embed/i',
        '/<\s*applet/i',
        '/<\s*meta/i',
        '/<\s*link/i',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Only validate API routes
        if (!$request->is('api/*')) {
            return $next($request);
        }

        // Skip validation for safe methods
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'])) {
            return $next($request);
        }

        // Check if we have validation rules for this route
        $routeKey = $this->getRouteKey($request);
        if (!isset($this->rules[$routeKey][$request->method()])) {
            return $next($request);
        }

        $rules = $this->rules[$routeKey][$request->method()];

        // Sanitize input
        $input = $this->sanitizeInput($request->all());

        // Validate
        try {
            $validator = Validator::make($input, $rules);
            
            if ($validator->fails()) {
                throw new ValidationException($validator);
            }

            // Replace request input with sanitized data
            $request->replace($validator->validated());
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        }

        return $next($request);
    }

    /**
     * Get route key for matching rules
     */
    protected function getRouteKey(Request $request): string
    {
        $path = $request->path();
        
        // Normalize route for matching
        foreach (array_keys($this->rules) as $pattern) {
            $regex = preg_replace('/\{[^}]+\}/', '[^/]+', $pattern);
            $regex = '^' . str_replace('/', '\/', $regex) . '(\?.*)?$';
            
            if (preg_match('/' . $regex . '/', $path)) {
                return $pattern;
            }
        }

        return $path;
    }

    /**
     * Sanitize input data recursively
     */
    protected function sanitizeInput(array $data): array
    {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $sanitized[$key] = $this->sanitizeString($value);
            } elseif (is_array($value)) {
                $sanitized[$key] = $this->sanitizeInput($value);
            } else {
                $sanitized[$key] = $value;
            }
        }
        
        return $sanitized;
    }

    /**
     * Sanitize a single string value
     */
    protected function sanitizeString(string $value): string
    {
        // Remove potential XSS patterns
        $sanitized = $value;
        
        foreach ($this->sanitizePatterns as $pattern) {
            $sanitized = preg_replace($pattern, '', $sanitized);
        }
        
        // Trim and limit length
        $sanitized = trim($sanitized);
        
        // Limit max length for safety
        if (strlen($sanitized) > 10000) {
            $sanitized = substr($sanitized, 0, 10000);
        }
        
        return $sanitized;
    }
}