import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { resetPasswordApi } from '../utils/api';

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = new URLSearchParams(window.location.search).get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Invalid Reset Link</h2>
          <p className="text-gray-500 text-sm">This password reset link is invalid or missing a token.</p>
          <a href="/" className="btn-primary inline-block text-sm">Back to Login</a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-teal-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Password Updated!</h2>
          <p className="text-gray-500 text-sm">Your password has been reset successfully. You can now log in with your new password.</p>
          <a href="/" className="btn-primary inline-block text-sm">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500 mb-4">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={`input pr-10 ${error ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="At least 6 characters"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className={`input ${error ? 'border-red-400 ring-1 ring-red-400' : ''}`}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              placeholder="Repeat your new password"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
            {loading ? 'Updating...' : 'Set New Password'}
          </button>

          <div className="text-center">
            <a href="/" className="text-sm text-gray-400 hover:text-teal-600 transition-colors">
              Back to Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
