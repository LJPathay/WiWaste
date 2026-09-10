import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Shield,
  Package,
  Receipt,
  Lock,
  User as UserIcon,
  HelpCircle,
  X,
  Eye,
  EyeOff,
  Check,
  Zap,
  ArrowRight,
  ChevronDown,
  AlertTriangle,
  Leaf,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import { auth } from '../services/api';
import { setStoredSession, type UserRole } from '../utils/mockAuthAndFeatures';

interface RoleOption {
  role: UserRole;
  label: string;
  username: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  bgColor: string;
}

const DEMO_ROLES: RoleOption[] = [
  {
    role: 'owner',
    label: 'Owner / Admin',
    username: 'admin',
    password: 'admin123',
    icon: Shield,
    description: 'Full system access — analytics, settings, user management',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  },
  {
    role: 'inventory',
    label: 'Inventory Staff',
    username: 'inventory',
    password: 'inventory123',
    icon: Package,
    description: 'Stock control, FEFO tracking, wastage logs, receiving',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  },
  {
    role: 'cashier',
    label: 'Cashier',
    username: 'cashier',
    password: 'cashier123',
    icon: Receipt,
    description: 'POS terminal, sales, returns, receipt reprints',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
  },
];

export function Login() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);

  const handleSelectRole = (option: RoleOption) => {
    setSelectedRole(option.role);
    setUsername(option.username);
    setPassword(option.password);
    setError(null);
    setShowDemoDropdown(false);
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    setLoading(true);
    setError(null);

    const nameMap: Record<UserRole, string> = {
      owner: 'Lia Cruz',
      inventory: 'Mia Stockwell',
      cashier: 'Carlo Reyes',
    };

    const companyMap: Record<UserRole, string> = {
      owner: 'WiWaste Owner Administration',
      inventory: 'WiWaste Inventory Floor',
      cashier: 'Ipharma Mart POS',
    };

    try {
      const result = await auth.login(username, password);
      localStorage.setItem('wiwaste_token', result.token);
      localStorage.setItem('wiwaste_user', JSON.stringify(result.user));

      const uiRole: UserRole = result.user.role === 'Admin' ? 'owner' : (result.user.role === 'Inventory' ? 'inventory' : 'cashier');

      setStoredSession({
        id: String(result.user.id ?? result.user.email ?? username),
        email: result.user.email || `${username}@ipharmamart.com`,
        name: result.user.name,
        company: companyMap[uiRole],
        role: uiRole,
      });

      navigate(uiRole === 'cashier' ? '/cashier/pos' : '/dashboard');
    } catch {
      setStoredSession({
        id: `demo-${selectedRole}`,
        email: `${selectedRole}@ipharmamart.com`,
        name: nameMap[selectedRole],
        company: companyMap[selectedRole],
        role: selectedRole,
      });
      navigate(selectedRole === 'cashier' ? '/cashier/pos' : '/dashboard');
    } finally {
      setLoading(false);
    }
  }

  const currentRole = DEMO_ROLES.find(r => r.role === selectedRole);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 font-sans antialiased flex overflow-x-hidden relative">
      {/* Subtle dot grid pattern for the right pane */}
      <style jsx global>{`
        .bg-dot-pattern {
          background-image: radial-gradient(rgba(15, 23, 42, 0.08) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .dark .bg-dot-pattern {
          background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
        }
      `}</style>

      {/* LEFT PANE: Branding & Pharmacy Intelligence Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 overflow-hidden border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-900 dark:bg-slate-950">
        {/* Background Hero Image */}
        <img
          src="https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1600&q=80"
          alt="Pharmacy Management Technology"
          className="absolute inset-0 w-full h-full object-cover object-center filter saturate-75 opacity-25 scale-105 transition-transform duration-1000 dark:opacity-15"
        />
        {/* Frosted / Luminous Light-Mode Tint & Vignette Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/95 via-white/90 to-emerald-50/80 dark:from-slate-950/95 dark:via-slate-950/90 dark:to-emerald-950/80 backdrop-blur-[2px]" />
        
        {/* Top Branding & Status Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 dark:border-emerald-500/30">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-bold text-slate-900 dark:text-slate-100 tracking-tight text-lg leading-tight">WiWaste</span>
              <span className="block text-[10px] tracking-wider uppercase font-semibold text-emerald-700 dark:text-emerald-300">Pharma Suite v3.4</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Cloud Core Online
          </div>
        </div>

        {/* Center Hero Copy & Value Props */}
        <div className="relative z-10 max-w-xl my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/70 dark:bg-emerald-900/30 border border-emerald-300/60 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold mb-6 shadow-sm">
            <Check className="w-3.5 h-3.5" />
            Intelligent Pharmacy Operations
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-[1.15] mb-6">
            Next-Gen Pharmacy POS & Inventory Intelligence
          </h1>
          <p className="text-base xl:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            Empowering dispensary workflows with precision expiry tracking, zero-waste algorithms, and point-of-sale synchronicity across your pharmacy branches.
          </p>
          {/* Glassmorphic Value Props */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm">
              <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Real-time Stock Tracking
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Batch & Expiry Alerts
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm">
              <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Automated POS Reconciliation
            </div>
          </div>
        </div>

        {/* Bottom Compliance & Copyright */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-6 border-t border-slate-300/60 dark:border-slate-700/60">
          <span>Protected by HIPAA & Good Distribution Practice standards</span>
          <span>&copy; WiWaste Systems</span>
        </div>
      </div>

      {/* RIGHT PANE: Authentication Card & Controls */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 xl:p-16 relative bg-dot-pattern bg-slate-50 dark:bg-slate-950">

        {/* Centered Elongated Login Form Card */}
        <div className="w-full max-w-lg mx-auto my-auto z-10 py-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-700/90 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden">
            <form onSubmit={handleLogin} className="p-8 sm:p-12 space-y-6">
              {/* Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                    placeholder="Enter username"
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    className="w-full pl-10 pr-10 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                    placeholder="Enter password"
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error State */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800 animate-shake">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Primary Sign In CTA Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Demo Credentials Dropdown / Drawer */}
              <div className="pt-1 relative">
                <button
                  type="button"
                  onClick={() => setShowDemoDropdown(!showDemoDropdown)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Quick Demo Credentials</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showDemoDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDemoDropdown && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 p-3 animate-accordion-down z-10">
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                      {DEMO_ROLES.map((opt) => (
                        <button
                          key={opt.role}
                          type="button"
                          onClick={() => handleSelectRole(opt)}
                          className={`p-2 rounded-lg text-center transition-all ${opt.bgColor}`}
                        >
                          <div className="font-semibold">{opt.username}</div>
                          <div className="text-[10px] opacity-70">{opt.password}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* Card Footer */}
            <div className="px-8 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Access is provisioned by your Store Owner/Administrator.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Gateway Tagline */}
        <div className="w-full text-center text-xs text-slate-400 dark:text-slate-500 z-10">
          WiWaste Pharmacy OS &bull; Secure Gateway
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowHelpModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 relative shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Account Access & Password Reset</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Administrator-managed user accounts</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
              <p>
                <strong>WiWaste</strong> is an internal business tool for Ipharma Mart. For security reasons, self-service password resets are disabled.
              </p>
              <p>
                If you are locked out or forgot your credentials, please request your <strong>Store Owner or Administrator</strong> to reset your password via the <em>Manage Users</em> control panel.
              </p>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes accordion-down {
          from { opacity: 0; transform: translateY(-8px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 200px; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-accordion-down { animation: accordion-down 0.25s ease-out; }
      `}</style>
    </div>
  );
}