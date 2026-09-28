<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Composite indexes for common query patterns
        // Note: Some indexes already exist from previous migrations - using try/catch to skip existing

        // Product table - product_name index already exists from earlier migration
        try {
            Schema::table('Product', function (Blueprint $table) {
                $table->index('category_id');
                $table->index('supplier_id');
                $table->index('status');
                $table->index('barcode');
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Inventory table - composite indexes for common queries
        try {
            Schema::table('Inventory', function (Blueprint $table) {
                $table->index(['product_id', 'business_id']);
                $table->index(['stock_status', 'business_id']);
                $table->index(['branch_id', 'product_id']);
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Sales_Transaction table
        try {
            Schema::table('Sales_Transaction', function (Blueprint $table) {
                $table->index(['business_id', 'transaction_date']);
                $table->index(['branch_id', 'transaction_date']);
                $table->index(['user_id', 'transaction_date']);
                $table->index('status');
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Sales_Item
        try {
            Schema::table('Sales_Item', function (Blueprint $table) {
                $table->index(['transaction_id', 'product_id']);
                $table->index('product_id');
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Wastage_Record
        try {
            Schema::table('Wastage_Record', function (Blueprint $table) {
                $table->index(['business_id', 'date_recorded']);
                $table->index(['branch_id', 'date_recorded']);
                $table->index('product_id');
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Return_Transaction
        try {
            Schema::table('Return_Transaction', function (Blueprint $table) {
                $table->index(['business_id', 'return_date']);
                $table->index(['branch_id', 'return_date']);
                $table->index(['sales_item_id']);
                $table->index('approval_status');
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Stock_Movement
        try {
            Schema::table('Stock_Movement', function (Blueprint $table) {
                $table->index(['business_id', 'movement_date']);
                $table->index(['branch_id', 'movement_date']);
                $table->index(['product_id', 'movement_date']);
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Inventory - expiration_date
        try {
            Schema::table('Inventory', function (Blueprint $table) {
                $table->index('expiration_date');
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // FEFO_Batch
        try {
            Schema::table('FEFO_Batch', function (Blueprint $table) {
                $table->index(['product_id', 'expiry_date']);
                $table->index(['business_id', 'status']);
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Stock_Receiving
        try {
            Schema::table('Stock_Receiving', function (Blueprint $table) {
                $table->index(['business_id', 'status']);
                $table->index(['branch_id', 'status']);
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Purchase_Order
        try {
            Schema::table('Purchase_Order', function (Blueprint $table) {
                $table->index(['business_id', 'status']);
                $table->index(['branch_id', 'status']);
                $table->index(['supplier_id', 'status']);
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Audit_Log
        try {
            Schema::table('Audit_Log', function (Blueprint $table) {
                $table->index(['entity_type', 'entity_id']);
                $table->index(['user_id', 'created_at']);
                $table->index(['business_id', 'created_at']);
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Category
        try {
            Schema::table('Category', function (Blueprint $table) {
                $table->index('Category_name');
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }

        // Supplier
        try {
            Schema::table('Supplier', function (Blueprint $table) {
                $table->index('supplier_name');
                $table->index(['business_id', 'status']);
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('Product', function (Blueprint $table) {
            // product_name index already exists from earlier migration
            $table->dropIndex(['category_id']);
            $table->dropIndex(['supplier_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['barcode']);
        });

        Schema::table('Inventory', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'business_id']);
            $table->dropIndex(['stock_status', 'business_id']);
            $table->dropIndex(['branch_id', 'product_id']);
        });

        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->dropIndex(['business_id', 'transaction_date']);
            $table->dropIndex(['branch_id', 'transaction_date']);
            $table->dropIndex(['user_id', 'transaction_date']);
            $table->dropIndex(['status']);
        });

        Schema::table('Sales_Item', function (Blueprint $table) {
            $table->dropIndex(['transaction_id', 'product_id']);
            $table->dropIndex(['product_id']);
        });

        Schema::table('Wastage_Record', function (Blueprint $table) {
            $table->dropIndex(['business_id', 'date_recorded']);
            $table->dropIndex(['branch_id', 'date_recorded']);
            $table->dropIndex(['product_id']);
        });

        Schema::table('Return_Transaction', function (Blueprint $table) {
            $table->dropIndex(['business_id', 'return_date']);
            $table->dropIndex(['branch_id', 'return_date']);
            $table->dropIndex(['sales_item_id']);
            $table->dropIndex(['approval_status']);
        });

        Schema::table('Stock_Movement', function (Blueprint $table) {
            $table->dropIndex(['business_id', 'movement_date']);
            $table->dropIndex(['branch_id', 'movement_date']);
            $table->dropIndex(['product_id', 'movement_date']);
        });

        Schema::table('Inventory', function (Blueprint $table) {
            $table->dropIndex(['expiration_date']);
        });

        Schema::table('FEFO_Batch', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'expiry_date']);
            $table->dropIndex(['business_id', 'status']);
        });

        Schema::table('Stock_Receiving', function (Blueprint $table) {
            $table->dropIndex(['business_id', 'status']);
            $table->dropIndex(['branch_id', 'status']);
        });

        Schema::table('Purchase_Order', function (Blueprint $table) {
            $table->dropIndex(['business_id', 'status']);
            $table->dropIndex(['branch_id', 'status']);
            $table->dropIndex(['supplier_id', 'status']);
        });

        Schema::table('Audit_Log', function (Blueprint $table) {
            $table->dropIndex(['entity_type', 'entity_id']);
            $table->dropIndex(['user_id', 'created_at']);
            $table->dropIndex(['business_id', 'created_at']);
        });

        Schema::table('Category', function (Blueprint $table) {
            $table->dropIndex(['Category_name']);
        });

        Schema::table('Supplier', function (Blueprint $table) {
            $table->dropIndex(['supplier_name']);
            $table->dropIndex(['business_id', 'status']);
        });
    }
};