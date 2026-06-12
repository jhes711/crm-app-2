import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Menu, TrendingUp } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { OpportunitiesList } from './components/OpportunitiesList';
import { OpportunityForm } from './components/OpportunityForm';
import { Reports } from './components/Reports';
import { ActivityLogPage } from './components/ActivityLog';
import { CompensationTracker } from './components/CompensationTracker';
import { ToastContainer } from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import { LoginScreen } from './components/LoginScreen';
import { ResetPassword } from './components/ResetPassword';

const AUTH_KEY = 'crm_auth';

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === 'true');
  const { toasts, toast, dismiss } = useToast();
  const [formRecord, setFormRecord] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogin = useCallback(() => {
    localStorage.setItem(AUTH_KEY, 'true');
    setAuthed(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  }, []);

  // Show reset password page regardless of auth state
  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

  if (!authed) return <LoginScreen onLogin={handleLogin} />;

  const openAdd = useCallback(() => { setFormRecord(null); setFormOpen(true); }, []);
  const openEdit = useCallback((r) => { setFormRecord(r); setFormOpen(true); }, []);
  const closeForm = useCallback(() => { setFormOpen(false); setFormRecord(null); }, []);

  const handleSaved = useCallback(() => {
    closeForm();
    setRefreshKey(k => k + 1);
  }, [closeForm]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-navy-900 h-14 px-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">ONYX-CRM</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 overflow-auto pt-14 md:pt-0 min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard key={refreshKey} onEdit={openEdit} />} />
          <Route path="/opportunities" element={<OpportunitiesList key={refreshKey} onAdd={openAdd} onEdit={openEdit} toast={toast} />} />
          <Route path="/reports" element={<Reports toast={toast} />} />
          <Route path="/activity" element={<ActivityLogPage key={refreshKey} />} />
          <Route path="/compensation" element={<CompensationTracker toast={toast} />} />
        </Routes>
      </main>

      {formOpen && (
        <OpportunityForm
          record={formRecord}
          onClose={closeForm}
          onSaved={handleSaved}
          toast={toast}
        />
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
