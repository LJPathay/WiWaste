import { Outlet } from 'react-router-dom';

export function CashierLayout() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <Outlet />
    </div>
  );
}
