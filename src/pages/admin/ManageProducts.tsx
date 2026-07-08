import React, { useState } from 'react';
import { Package, Search, Plus, Archive, Edit2 } from 'lucide-react';

interface ProductMock {
  id: string;
  name: string;
  sku: string;
  category: 'Food' | 'Medicine' | 'Beverages' | 'Personal Care';
  price: number;
  stock: number;
  expiry: string;
}

const INITIAL_PRODUCTS: ProductMock[] = [
  { id: '1', name: 'Del Monte Tomato Sauce 250g', sku: 'DM-TS-250', category: 'Food', price: 32.50, stock: 45, expiry: '2026-11-20' },
  { id: '2', name: 'Biogesic Paracetamol 500mg', sku: 'BG-P-500', category: 'Medicine', price: 7.50, stock: 120, expiry: '2027-03-15' },
  { id: '3', name: 'Coca-Cola 1.5L', sku: 'CC-15L', category: 'Beverages', price: 68.00, stock: 8, expiry: '2026-09-05' },
  { id: '4', name: 'Safeguard White Soap 130g', sku: 'SG-WS-130', category: 'Personal Care', price: 54.00, stock: 25, expiry: '2028-05-10' },
  { id: '5', name: 'Century Tuna Flakes in Oil 180g', sku: 'CT-FO-180', category: 'Food', price: 42.00, stock: 3, expiry: '2026-08-12' },
  { id: '6', name: 'Neozep Forte (Tablet)', sku: 'NZ-F-TAB', category: 'Medicine', price: 8.50, stock: 95, expiry: '2026-12-01' },
  { id: '7', name: 'C2 Green Tea 500ml', sku: 'C2-GT-500', category: 'Beverages', price: 22.00, stock: 32, expiry: '2026-10-18' },
  { id: '8', name: 'Colgate Triple Action 150g', sku: 'CG-TA-150', category: 'Personal Care', price: 115.00, stock: 15, expiry: '2027-08-22' },
  { id: '9', name: 'San Miguel Pale Pilsen Can', sku: 'SM-PP-CAN', category: 'Beverages', price: 72.00, stock: 50, expiry: '2026-12-31' },
  { id: '10', name: 'Gatorade Blue Bolt 500ml', sku: 'GT-BB-500', category: 'Beverages', price: 45.00, stock: 12, expiry: '2026-10-10' },
];

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

export function ManageProducts() {
  const [products, setProducts] = useState<ProductMock[]>(INITIAL_PRODUCTS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Food' | 'Medicine' | 'Beverages' | 'Personal Care'>('All');

  const handleArchive = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
                          product.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Products</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage product details and baseline tracking limits.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#00574f] transition-all">
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            {(['All', 'Food', 'Medicine', 'Beverages', 'Personal Care'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  categoryFilter === cat
                    ? 'bg-white dark:bg-slate-950 text-[#006a61] dark:text-[#7ef0cf] shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-250"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-b border-slate-200 dark:border-white/10 font-bold">
              <tr>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Unit Price</th>
                <th className="px-6 py-3">Stock Level</th>
                <th className="px-6 py-3">Expiry Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-55/20 dark:hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{p.sku}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.category}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{currencyFormatter.format(p.price)}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{p.stock} units</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{p.expiry}</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-[#006a61] dark:text-[#7ef0cf] hover:underline">
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleArchive(p.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
