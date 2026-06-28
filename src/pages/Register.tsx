import React, { useState } from 'react';
import { useNavigate } from 'react-router';

export function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    // Mock register: wait then redirect to login
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    navigate('/login');
  }

  return (
    <div className="max-w-md mx-auto mt-24 p-8 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Create an account</h2>
      <form onSubmit={handleRegister}>
        <label className="block mb-2 text-sm">Full name</label>
        <input className="w-full border px-3 py-2 rounded mb-4" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="block mb-2 text-sm">Email</label>
        <input className="w-full border px-3 py-2 rounded mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="block mb-2 text-sm">Password</label>
        <input type="password" className="w-full border px-3 py-2 rounded mb-4" value={password} onChange={(e) => setPassword(e.target.value)} />

        <div className="flex justify-between items-center">
          <button type="submit" className="bg-[#131b2e] text-white px-4 py-2 rounded disabled:opacity-50" disabled={loading}>
            {loading ? 'Creating...' : 'Create account'}
          </button>

          <button type="button" className="text-sm text-[#006a61] underline" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}
