import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Shield, Package, Receipt, Lock, User as UserIcon, HelpCircle, X, Eye, EyeOff, Check, Zap, ArrowRight, ChevronDown, AlertTriangle } from 'lucide-react';
import { auth } from '../services/api';
import { setStoredSession, type UserRole } from '../utils/mockAuthAndFeatures';

interface RoleOption {
  role: UserRole;
  label: string;
  username: string;
  password: string;
  icon: React.ReactNode;
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
    icon: <Shield className="h-5 w-5" />,
    description: 'Full system access — analytics, settings, user management',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  },
  {
    role: 'inventory',
    label: 'Inventory Staff',
    username: 'inventory',
    password: 'inventory123',
    icon: <Package className="h-5 w-5" />,
    description: 'Stock control, FEFO tracking, wastage logs, receiving',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  },
  {
    role: 'cashier',
    label: 'Cashier',
    username: 'cashier',
    password: 'cashier123',
    icon: <Receipt className="h-5 w-5" />,
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

  const handleSelectRole = (option: RoleOption) => {
    setSelectedRole(option.role);
    setUsername(option.username);
    setPassword(option.password);
    setError(null);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-100/30 dark:bg-emerald-900/10 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-100/30 dark:bg-blue-900/10 blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-100/10 dark:bg-emerald-900/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-10 animate-fade-down">
          <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">WiWaste</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Welcome Back</h1>
          <p className="text-slate-500 dark:text-slate-400">Sign in to access your dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 dark:border-white/10 overflow-hidden animate-slide-up">
          {/* Role Selector - Compact Pill Style */}
          <div className="p-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Access Level</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Click to switch</span>
            </div>
            <div className="flex gap-2" role="radiogroup" aria-label="Select your role">
              {DEMO_ROLES.map((opt) => {
                const isSelected = selectedRole === opt.role;
                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => handleSelectRole(opt)}
                    role="radio"
                    aria-checked={isSelected}
                    className={`relative flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? `${opt.bgColor} border-transparent shadow-lg shadow-emerald-500/10 dark:shadow-emerald-500/5`
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-100 dark:bg-emerald-900/30' : opt.bgColor}`}>
                      <opt.icon className={isSelected ? 'text-emerald-600 dark:text-emerald-400' : opt.color} />
                    </div>
                    <span className={`text-xs font-semibold truncate w-full text-center ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>
                      {opt.label}
                    </span>
                    {isSelected && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-500 animate-bounce-subtle" />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Role Description */}
            <p className="mt-3 text-xs text-center text-slate-500 dark:text-slate-400 min-h-[36px] transition-opacity">
              {currentRole?.description}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="p-5 space-y-4.5">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="username"
                  className="w-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all disabled:opacity-50"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                  aria-describedby="username-hint"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all disabled:opacity-50"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 group"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Authenticating...
                </span>
              ) : (
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="px-5 pb-5">
            <details className="group">
              <summary className="flex items-center justify-center gap-2 cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all list-none">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Quick Demo Credentials</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 animate-accordion-down">
                <div className="grid grid-cols-3 gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                  {DEMO_ROLES.map((opt) => (
                    <div key={opt.role} className={`p-2 rounded-lg ${opt.bgColor} text-center`}>
                      <div className="font-semibold">{opt.username}</div>
                      <div className="text-[10px] opacity-70">{opt.password}</div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>

          <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-white/5">
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Access is provisioned by your Store Owner/Administrator.
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center animate-fade-up">
          <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
            Need an account? Request access
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowHelpModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 relative shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
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
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/60 dark:border-white/5">
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
          @keyframes fade-down {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(10px); }
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
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }
          .animate-fade-in { animation: fade-in 0.3s ease-out; }
          .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
          .animate-fade-down { animation: fade-down 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
          .animate-fade-up { animation: fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
          .animate-shake { animation: shake 0.4s ease-in-out; }
          .animate-accordion-down { animation: accordion-down 0.25s ease-out; }
          .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
          .animate-bounce-subtle { animation: bounce 1s ease-in-out infinite; }
          details[open] summary ~ * { animation: accordion-down 0.25s ease-out; }
          details summary::-webkit-details-marker { display: none; }
        `}</style>
      </div>
    </div>
  );
}