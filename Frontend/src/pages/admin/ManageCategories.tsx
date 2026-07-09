import React, { useState } from 'react';
import { ClipboardList, Plus, Edit2, Archive, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

interface CategoryMock {
  id: string;
  name: string;
  count: number;
  description: string;
}

const INITIAL_CATEGORIES: CategoryMock[] = [
  { id: '1', name: 'Food & Beverage', count: 145, description: 'Fresh produce, dry ingredients, canned goods, and beverages.' },
  { id: '2', name: 'Medicine & Health', count: 86, description: 'Over-the-counter painkillers, vitamins, supplements, and pharmacy items.' },
  { id: '3', name: 'Personal Care', count: 62, description: 'Hygiene products, soap, toothbrushes, skincare, and hair products.' },
  { id: '4', name: 'Household Essentials', count: 48, description: 'Cleaning liquids, paper towels, laundry detergents, and plastic bags.' },
  { id: '5', name: 'Dairy & Eggs', count: 32, description: 'Milk, cheese, yogurt, salted butter, and fresh local chicken eggs.' },
  { id: '6', name: 'Frozen Foods', count: 29, description: 'Frozen meat, processed hotdogs, frozen fries, and assorted ice cream.' },
];

export function ManageCategories() {
  const [categories, setCategories] = useState<CategoryMock[]>(INITIAL_CATEGORIES);

  const handleArchive = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Categories</h1>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Classify product inventory sectors for shelf placement index.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#00574f] transition-all">
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-b border-slate-200 dark:border-white/10 font-bold">
              <tr>
                <th className="px-6 py-3">Category Name</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Product Count</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-55/20 dark:hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{cat.name}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-md">{cat.description}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{cat.count} SKUs</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-[#006a61] dark:text-[#7ef0cf] hover:underline">
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleArchive(cat.id)}
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
