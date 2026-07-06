import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { inferRoleFromEmail, initializeDashboard, setStoredSession } from '../utils/mockAuthAndFeatures';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const role = inferRoleFromEmail(email);
      await initializeDashboard(email, password, role);
      setStoredSession({
        email,
        name: role === 'admin' ? 'Lia Cruz' : role === 'inventory' ? 'Mia Stockwell' : 'John Store Ops',
        company: role === 'admin' ? 'WiWaste Central Administration' : role === 'inventory' ? 'WiWaste Inventory Floor' : 'WiWaste MiniMart + Pharma',
        role,
      });
      // On success navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Login failed (mock)');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-24 p-8 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>
      <form onSubmit={handleLogin}>
        <label className="block mb-2 text-sm">Email</label>
        <input
          className="w-full border px-3 py-2 rounded mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block mb-2 text-sm">Password</label>
        <input
          type="password"
          className="w-full border px-3 py-2 rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="text-red-600 mb-2">{error}</div>}

        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-[#131b2e] text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <button
            type="button"
            className="text-sm text-[#006a61] underline"
            onClick={() => navigate('/register')}
          >
            Create account
          </button>
        </div>
      </form>
    </div>
  );
}
