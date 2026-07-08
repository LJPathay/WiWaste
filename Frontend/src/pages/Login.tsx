import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { initializeDashboard, setStoredSession, type UserRole } from '../utils/mockAuthAndFeatures';
import { Shield, Package, BarChart3 } from 'lucide-react';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; icon: React.ReactNode; description: string }> = [
  {
    value: 'admin',
    label: 'Administrator',
    icon: <Shield className="h-5 w-5" />,
    description: 'Manage users, products, categories, suppliers, and system settings',
  },
  {
    value: 'inventory',
    label: 'Inventory Staff',
    icon: <Package className="h-5 w-5" />,
    description: 'Record stock-in/out, wastage, manage inventory, and track FEFO',
  },
  {
    value: 'manager',
    label: 'Business Owner/Manager',
    icon: <BarChart3 className="h-5 w-5" />,
    description: 'View dashboard, monitor performance, and approve replenishment',
  },
];

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await initializeDashboard(email, password, selectedRole);
      // Fall back to a role-based demo email when the field is left blank
      const resolvedEmail = email.trim() || `${selectedRole}@wiwaste.demo`;
      setStoredSession({
        email: resolvedEmail,
        name: selectedRole === 'admin' ? 'Lia Cruz' : selectedRole === 'inventory' ? 'Mia Stockwell' : 'John Store Ops',
        company: selectedRole === 'admin' ? 'WiWaste Central Administration' : selectedRole === 'inventory' ? 'WiWaste Inventory Floor' : 'WiWaste MiniMart + Pharma',
        role: selectedRole,
      });
      // Redirect to main dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Login failed (mock)');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex items-start justify-center pt-12 p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1b1b1d] mb-2">Welcome to WiWaste</h1>
          <p className="text-[#45464d]">Select your role to access the platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold mb-6 text-[#1b1b1d]">Select Your Role</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedRole === role.value
                    ? 'border-[#006a61] bg-[#006a61]/5 ring-2 ring-[#006a61]/20'
                    : 'border-gray-200 hover:border-[#006a61]/50 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${selectedRole === role.value ? 'bg-[#006a61] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {role.icon}
                  </div>
                  <span className="font-semibold text-sm text-[#1b1b1d]">{role.label}</span>
                </div>
                <p className="text-xs text-[#45464d] leading-relaxed">{role.description}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-[#1b1b1d]">Email</label>
              <input
                className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-transparent transition-all"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-[#1b1b1d]">Password</label>
              <input
                type="password"
                className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-transparent transition-all"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}

            <button
              type="submit"
              className="w-full bg-[#131b2e] text-white px-4 py-3 rounded-xl font-semibold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !selectedRole}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-[#006a61] hover:underline font-medium"
                onClick={() => navigate('/register')}
              >
                Create account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
