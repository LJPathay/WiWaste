import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Package } from 'lucide-react';

export function StockIn() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to ManageInventory since stock operations are now in the modal
    navigate('/inventory/manage', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Stock In Moved
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Stock operations are now available in the Manage Inventory page
        </p>
        <button
          onClick={() => navigate('/inventory/manage')}
          className="inline-flex items-center gap-2 text-[#006a61] hover:text-[#00574f] font-semibold text-sm"
        >
          Go to Manage Inventory
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
