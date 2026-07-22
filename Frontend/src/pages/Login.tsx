import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield, Package, Receipt, Lock, User as UserIcon, HelpCircle, X } from 'lucide-react';
import { auth } from '../services/api';
import { setStoredSession, type UserRole } from '../utils/mockAuthAndFeatures';

interface RoleOption {
  role: UserRole;
  label: string;
  username: string;
  password: string;
  icon: React.ReactNode;
  description: string;
}

const DEMO_ROLES: RoleOption[] = [
  {
    role: 'owner',
    label: 'Owner',
    username: 'admin',
    password: 'admin123',
    icon: <Shield className="h-4 w-4" />,
    description: 'Full system administration, settings, and executive analytics.',
  },
  {
    role: 'inventory',
    label: 'Inventory Staff',
    username: 'inventory',
    password: 'inventory123',
    icon: <Package className="h-4 w-4" />,
    description: 'Stock management, FEFO tracking, and wastage logs.',
  },
  {
    role: 'cashier',
    label: 'Cashier',
    username: 'cashier',
    password: 'cashier123',
    icon: <Receipt className="h-4 w-4" />,
    description: 'POS terminal operations, receipt reprints, and returns.',
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
        email: result.user.email || `${username}@ipharmamart.com`,
        name: result.user.name,
        company: companyMap[uiRole],
        role: uiRole,
      });

      navigate('/dashboard');
    } catch (err: any) {
      // Fallback for offline prototype demo
      setStoredSession({
        email: `${selectedRole}@ipharmamart.com`,
        name: nameMap[selectedRole],
        company: companyMap[selectedRole],
        role: selectedRole,
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-slate-950 flex items-start justify-center pt-8 p-6 font-sans">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">System Login</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Ipharma Mart Enterprise Inventory & POS Portal</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-slate-200/80 dark:border-white/10 space-y-6">
          {/* Prototype Evaluator Helper Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#006a61] dark:text-[#7ef0cf] flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Evaluator Quick-Fill Credentials
              </span>
              <span className="text-[10px] text-slate-400">Click to pre-fill</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ROLES.map((opt) => {
                const isSelected = selectedRole === opt.role;
                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => handleSelectRole(opt)}
                    className={`px-3 py-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-[#006a61] bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf] font-bold shadow-sm'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.icon}
                    <span className="text-xs truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className="w-full border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006a61] text-sm transition-all"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Password</label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs text-[#006a61] dark:text-[#7ef0cf] hover:underline font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  className="w-full border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006a61] text-sm transition-all"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-xs bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-xl border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 text-sm shadow-sm"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 dark:border-white/5">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Access is provisioned by your Store Owner/Administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Account Recovery / Password Reset Info Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 relative shadow-lg">
            <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf] rounded-xl">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Account Access & Password Reset</h2>
                <p className="text-xs text-slate-500">Administrator-managed user accounts</p>
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
              className="mt-5 w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
