import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const initialized = useAuthStore((s) => s.initialized);

  // Redirect if already logged in (shared session from Frontend)
  useEffect(() => {
    if (initialized && user) {
      navigate('/');
    }
  }, [user, initialized, navigate]);

  // Show loading while checking for existing session
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#d1bd23] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div
        className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #d1bd23 0%, transparent 70%)',
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />
      <div
        className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-15 blur-3xl z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #7fb069 0%, transparent 70%)',
          animation: 'pulse 10s ease-in-out infinite reverse',
        }}
      />

      <div className="w-full relative z-10" style={{ maxWidth: '448px' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">HrdHat Supervisor</h1>
          <p className="text-slate-400 mt-2">Sign in to manage your projects</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-[#d1bd23] focus:ring-1 focus:ring-[#d1bd23] outline-none transition-all"
                placeholder="you@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-[#d1bd23] focus:ring-1 focus:ring-[#d1bd23] outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-[#d94730]/10 border border-[#d94730]/30">
                <p className="text-sm text-[#e58c7f]">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#d1bd23] to-[#9e5e1a] text-white font-semibold rounded-xl hover:from-[#b19e1d] hover:to-[#7a4a15] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Use your existing HrdHat account to sign in
          </p>

          {/* Back to HrdHat link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                const frontendUrl = import.meta.env.DEV
                  ? 'http://localhost:5173'
                  : 'https://hrdhat.site';
                window.location.href = frontendUrl;
              }}
              className="text-sm text-[#d1bd23] hover:text-[#e4c94f] transition-colors"
            >
              &larr; Back to HrdHat
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
