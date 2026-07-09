import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Users,
  Settings,
  Activity,
  Database,
  AlertTriangle,
  ArrowUpRight,
  Info,
  Lock,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

interface AdminStats {
  totalUsers: number;
  registeredStores: number;
  totalProducts: number;
  pendingReports: number;
  activeInventoryAlerts: number;
}

interface ActivityLog {
  id: string;
  action: string;
  user: string;
  time: string;
  status: 'success' | 'warning' | 'error';
}

interface ChartData {
  label: string;
  value: number;
}

interface UserGrowthData {
  month: string;
  users: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    registeredStores: 0,
    totalProducts: 0,
    pendingReports: 0,
    activeInventoryAlerts: 0,
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<ChartData[]>([]);
  const [systemUsage, setSystemUsage] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setStats({
          totalUsers: 15,
          registeredStores: 8,
          totalProducts: 245,
          pendingReports: 3,
          activeInventoryAlerts: 5,
        });
        setActivities([
          { id: '1', action: 'Product "Lucky Me! Pancit Canton" added', user: 'Manager', time: '2 min ago', status: 'success' },
          { id: '2', action: 'Stock-in recorded for SKU: LM-PC-80', user: 'Inventory Staff', time: '15 min ago', status: 'success' },
          { id: '3', action: 'Low stock alert: Coca-Cola 1.5L', user: 'System', time: '1 hour ago', status: 'warning' },
          { id: '4', action: 'Supplier "Nestle Philippines" updated', user: 'Manager', time: '2 hours ago', status: 'success' },
          { id: '5', action: 'Database backup completed', user: 'System', time: '3 hours ago', status: 'success' },
        ]);
        setUserGrowth([
          { month: 'Jan', users: 8 },
          { month: 'Feb', users: 10 },
          { month: 'Mar', users: 12 },
          { month: 'Apr', users: 15 },
        ]);
        setProductsByCategory([
          { label: 'Beverages', value: 85 },
          { label: 'Food', value: 120 },
          { label: 'Medicine', value: 25 },
          { label: 'Personal Care', value: 15 },
        ]);
        setSystemUsage([
          { label: 'Owners', value: 5 },
          { label: 'Managers', value: 8 },
          { label: 'Inventory Staff', value: 12 },
        ]);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const kpiCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-blue-500 to-cyan-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
      description: 'Registered system users',
    },
    {
      label: 'Registered Stores',
      value: stats.registeredStores,
      icon: Database,
      color: 'from-emerald-500 to-teal-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      description: 'Active store locations',
    },
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: Activity,
      color: 'from-violet-500 to-indigo-400',
      bgColor: 'bg-violet-50 dark:bg-violet-500/10',
      textColor: 'text-violet-600 dark:text-violet-400',
      description: 'Products in catalog',
    },
    {
      label: 'Pending Reports',
      value: stats.pendingReports,
      icon: FileText,
      color: 'from-orange-500 to-amber-400',
      bgColor: 'bg-orange-50 dark:bg-orange-500/10',
      textColor: 'text-orange-600 dark:text-orange-400',
      description: 'Requires attention',
      alert: stats.pendingReports > 0,
    },
  ];

  const adminModules = [
    {
      title: 'Manage Users',
      description: 'User accounts and permissions',
      to: '/admin/users',
      icon: Users,
    },
    {
      title: 'System Settings',
      description: 'Configuration and settings',
      to: '/admin/settings',
      icon: Settings,
    },
    {
      title: 'Generate Reports',
      description: 'System and usage reports',
      to: '/admin/reports',
      icon: Activity,
    },
    {
      title: 'Database Management',
      description: 'Database status and backups',
      to: '/admin/settings',
      icon: Database,
    },
    {
      title: 'Security Settings',
      description: 'Access control and security',
      to: '/admin/settings',
      icon: Lock,
    },
    {
      title: 'API Configuration',
      description: 'API keys and endpoints',
      to: '/admin/settings',
      icon: Globe,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            System administration and configuration
          </TooltipContent>
        </UITooltip>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-3xl border bg-white/70 backdrop-blur-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:bg-white/80 dark:bg-white/5 dark:backdrop-blur-xl dark:hover:bg-white/8 ${
                card.alert ? 'ring-2 ring-orange-400 border-transparent' : 'border-white/60 dark:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {card.label}
                  </div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-[#0b1c30] dark:text-slate-100">
                    {card.value}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{card.description}</div>
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 text-xl ${card.textColor}`} />
                </div>
              </div>
              {card.alert && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 px-3 py-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[11px] font-medium leading-4 text-orange-700 dark:text-orange-300">
                    Requires attention
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Admin Modules */}
      <section>
        <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {adminModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.title}
                to={module.to}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-700">
                    <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-slate-300 transition-all group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#0b1c30] dark:text-slate-100">{module.title}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100 mb-4">User Growth</h2>
          <div className="space-y-3">
            {userGrowth.map((data) => {
              const maxUsers = Math.max(...userGrowth.map(d => d.users));
              const percentage = (data.users / maxUsers) * 100;
              return (
                <div key={data.month} className="flex items-center gap-3">
                  <div className="w-12 text-xs font-medium text-slate-600 dark:text-slate-400">{data.month}</div>
                  <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-blue-500 dark:bg-blue-600 rounded-lg transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-8 text-xs font-bold text-slate-700 dark:text-slate-300 text-right">{data.users}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Products by Category */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100 mb-4">Products by Category</h2>
          <div className="space-y-3">
            {productsByCategory.map((data) => {
              const maxValue = Math.max(...productsByCategory.map(d => d.value));
              const percentage = (data.value / maxValue) * 100;
              const colors = {
                'Beverages': 'bg-blue-500 dark:bg-blue-600',
                'Food': 'bg-emerald-500 dark:bg-emerald-600',
                'Medicine': 'bg-violet-500 dark:bg-violet-600',
                'Personal Care': 'bg-orange-500 dark:bg-orange-600',
              };
              return (
                <div key={data.label} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-medium text-slate-600 dark:text-slate-400">{data.label}</div>
                  <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${colors[data.label as keyof typeof colors] || 'bg-slate-500 dark:bg-slate-600'} rounded-lg transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-8 text-xs font-bold text-slate-700 dark:text-slate-300 text-right">{data.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Usage */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900 lg:col-span-2">
          <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100 mb-4">User Distribution by Role</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systemUsage.map((data) => {
              const maxValue = Math.max(...systemUsage.map(d => d.value));
              const percentage = (data.value / maxValue) * 100;
              const colors = {
                'Owners': 'bg-blue-500 dark:bg-blue-600',
                'Managers': 'bg-emerald-500 dark:bg-emerald-600',
                'Inventory Staff': 'bg-violet-500 dark:bg-violet-600',
              };
              return (
                <div key={data.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{data.label}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{data.value}</span>
                  </div>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${colors[data.label as keyof typeof colors] || 'bg-slate-500 dark:bg-slate-600'} rounded-lg transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Recent Activity</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>Last 24 hours</span>
          </div>
        </div>
        <div className="space-y-3">
          {activities.map((activity) => {
            const statusColor = activity.status === 'success' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' :
                               activity.status === 'warning' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' :
                               'text-rose-500 bg-rose-50 dark:bg-rose-500/10';
            return (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statusColor}`}>
                  {activity.status === 'success' && <CheckCircle className="h-4 w-4" />}
                  {activity.status === 'warning' && <AlertTriangle className="h-4 w-4" />}
                  {activity.status === 'error' && <XCircle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activity.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">{activity.user}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">{activity.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
