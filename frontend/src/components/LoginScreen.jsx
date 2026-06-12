import React, { useState } from 'react';
import { Eye, EyeOff, Mail, CheckCircle, TrendingUp } from 'lucide-react';
import { loginApi, forgotPasswordApi } from '../utils/api';

export const LoginScreen = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginApi(password);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotError('');
    setForgotLoading(true);
    try {
      await forgotPasswordApi();
      setForgotSent(true);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to send reset email. Check backend/.env configuration.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500 mb-4">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">VO-CRM</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your password to continue</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={`input pr-10 ${error ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password"
                autoFocus
                disabled={loading}
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
            {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
            {loading ? 'Signing in…' : 'Login'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotSent(false); setForgotError(''); }}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-teal-500 mx-auto" />
                <h2 className="text-lg font-bold text-gray-900">Check Your Email</h2>
                <p className="text-sm text-gray-600">
                  A password reset link has been sent to your registered email address.
                  The link expires in 1 hour.
                </p>
                <button onClick={() => setShowForgot(false)} className="btn-primary w-full">
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-teal-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Forgot Password</h2>
                    <p className="text-xs text-gray-500">A reset link will be sent to your email</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  A password reset link will be sent to{' '}
                  <strong className="text-gray-800">jhes711@gmail.com</strong>.
                  Click the link in the email to set a new password.
                </p>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    {forgotError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={forgotLoading}
                    className="btn-primary flex-1"
                  >
                    {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
