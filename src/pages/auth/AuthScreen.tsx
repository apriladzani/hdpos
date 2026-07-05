import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { User } from '../../types';

export const AuthScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier' | 'gudang'>('cashier');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (authMode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else if (authMode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setAuthMode('login');
        setError('Registrasi berhasil! Silakan login.');
      } else if (authMode === 'forgot') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword: password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setAuthMode('login');
        setError('Password berhasil diubah! Silakan login dengan password baru.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-200">
            <TrendingUp size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">@HDPOS</h2>
          <p className="text-slate-500 mt-2">
            {authMode === 'login' && 'Masuk ke akun Anda'}
            {authMode === 'register' && 'Daftar akun baru'}
            {authMode === 'forgot' && 'Reset Password Anda'}
          </p>
        </div>

        {error && (
          <div className={cn("p-4 rounded-xl text-sm font-bold mb-6", error.includes('berhasil') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'login' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Username atau Email</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
              />
            </div>
          )}

          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Username</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          )}

          {(authMode === 'register' || authMode === 'forgot') && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              {authMode === 'forgot' ? 'Password Baru' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {authMode === 'login' && (
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setError(''); }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Lupa Password?
                </button>
              </div>
            )}
          </div>

          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                value={role}
                onChange={e => setRole(e.target.value as any)}
              >
                <option value="cashier">Kasir</option>
                <option value="admin">Admin</option>
                <option value="gudang">Gudang</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-6"
          >
            {authMode === 'login' ? 'Masuk' : authMode === 'register' ? 'Daftar' : 'Simpan Password Baru'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3 flex flex-col">
          {authMode !== 'login' && (
            <button
              onClick={() => { setAuthMode('login'); setError(''); }}
              className="text-sm font-bold text-slate-500 hover:text-slate-800"
            >
              Kembali ke Login
            </button>
          )}
          {authMode !== 'register' && (
            <button
              onClick={() => { setAuthMode('register'); setError(''); }}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
            >
              Belum punya akun? Daftar di sini
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
