import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, TrendingUp, CheckCircle, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getDeals, createDeal, updateDeal, deleteDeal } from '../utils/api';
import { ConfirmDialog } from './ui/ConfirmDialog';

const ANNUAL_HIG_GOAL = 500000;
const STAGES = ['UW', 'CO', 'Sale', 'Inactive'];

const STAGE_COLORS = {
  UW:       'bg-[#FFF4EE] text-[#EA501A]',
  CO:       'bg-yellow-100 text-[#8B6A00]',
  Sale:     'bg-green-100 text-[#008B3D]',
  Inactive: 'bg-gray-100 text-gray-500',
};

const emptyForm = () => ({
  name: '',
  sales_stage: 'UW',
  total_revenue: '',
  referral_split: '',
  hig_revenue: '',
  target_premium: '',
  last_contact: '',
  sale_paid_date: '',
  is_paid: false,
});

export const CompensationTracker = ({ toast }) => {
  const [deals, setDeals] = useState([]);
  const [view, setView] = useState('active');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getDeals()
      .then(setDeals)
      .catch(() => toast?.('Failed to load deals', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const totalHIG = deals.reduce((s, d) => s + (d.hig_revenue || 0), 0);
  const higPct = Math.min(100, Math.round((totalHIG / ANNUAL_HIG_GOAL) * 100));
  const higGoalMet = totalHIG >= ANNUAL_HIG_GOAL;

  const activeDeals = deals.filter(d => !d.is_paid);
  const paidDeals = deals.filter(d => d.is_paid);
  const visibleDeals = view === 'paid' ? paidDeals : activeDeals;

  const openAdd = () => {
    setFormData(emptyForm());
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (deal) => {
    setFormData({
      name: deal.name || '',
      sales_stage: deal.sales_stage || 'UW',
      total_revenue: deal.total_revenue ?? '',
      referral_split: deal.referral_split || '',
      hig_revenue: deal.hig_revenue ?? '',
      target_premium: deal.target_premium ?? '',
      last_contact: deal.last_contact || '',
      sale_paid_date: deal.sale_paid_date || '',
      is_paid: Boolean(deal.is_paid),
    });
    setEditId(deal.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData(emptyForm());
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast?.('Name is required', 'error'); return; }
    setSaving(true);
    const payload = {
      ...formData,
      total_revenue: formData.total_revenue === '' ? 0 : Number(formData.total_revenue),
      hig_revenue: formData.hig_revenue === '' ? 0 : Number(formData.hig_revenue),
      target_premium: formData.target_premium === '' ? 0 : Number(formData.target_premium),
      is_paid: formData.is_paid ? 1 : 0,
    };
    try {
      if (editId) {
        await updateDeal(editId, payload);
        toast?.('Deal updated', 'success');
      } else {
        await createDeal(payload);
        toast?.('Deal added', 'success');
      }
      closeForm();
      load();
    } catch {
      toast?.('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDeal(deleteId);
      toast?.('Deal deleted', 'success');
      setDeleteId(null);
      load();
    } catch {
      toast?.('Delete failed', 'error');
    }
  };

  const field = (key, val) => setFormData(f => ({ ...f, [key]: val }));

  const visibleTotalRevenue = visibleDeals.reduce((s, d) => s + (d.total_revenue || 0), 0);
  const visibleHIG = visibleDeals.reduce((s, d) => s + (d.hig_revenue || 0), 0);
  const visiblePremium = visibleDeals.reduce((s, d) => s + (d.target_premium || 0), 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compensation Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Deal pipeline &amp; HIG revenue tracking</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Deal
        </button>
      </div>

      {/* HIG Revenue Progress */}
      <div className={`card ${higGoalMet ? 'border-green-200 bg-green-50/40' : ''}`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {higGoalMet
              ? <CheckCircle className="w-5 h-5 text-[#008B3D]" />
              : <TrendingUp className="w-5 h-5 text-gray-400" />}
            <span className="font-semibold text-gray-900">Annual HIG Revenue Goal</span>
            {higGoalMet && (
              <span className="text-xs font-semibold text-[#008B3D] bg-green-100 px-2 py-0.5 rounded-full">Goal Achieved!</span>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-bold tabular-nums ${higGoalMet ? 'text-[#008B3D]' : 'text-gray-900'}`}>
                {formatCurrency(totalHIG)}
              </span>
              <span className="text-base sm:text-lg text-gray-400">/ {formatCurrency(ANNUAL_HIG_GOAL)}</span>
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ease-out ${higGoalMet ? 'bg-[#008B3D]' : 'bg-[#EA501A]'}`}
            style={{ width: `${higPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {higPct}% of $500,000 annual goal
          {!higGoalMet && ` — ${formatCurrency(ANNUAL_HIG_GOAL - totalHIG)} remaining`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'active', label: 'Active Pipeline', count: activeDeals.length },
          { key: 'paid',   label: 'Paid Deals',      count: paidDeals.length  },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 sm:px-5 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${view === key ? 'bg-teal-100 text-[#008B3D]' : 'bg-gray-200 text-gray-500'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Deals — Mobile Card View */}
      <div className="md:hidden card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleDeals.length === 0 ? (
          <div className="text-center py-14 text-gray-400 px-6">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No {view === 'active' ? 'active' : 'paid'} deals yet</p>
            <p className="text-sm mt-1">
              {view === 'active' ? 'Click "Add Deal" to get started' : 'Mark a deal as paid to move it here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visibleDeals.map(deal => (
              <div key={deal.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[deal.sales_stage] || 'bg-gray-100 text-gray-500'}`}>
                        {deal.sales_stage}
                      </span>
                      {deal.referral_split && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{deal.referral_split}</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{deal.name}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2 text-xs">
                      <div><span className="text-gray-400">Revenue: </span><span className="font-medium text-gray-700">{formatCurrency(deal.total_revenue)}</span></div>
                      <div><span className="text-gray-400">HIG: </span><span className="font-semibold text-[#008B3D]">{formatCurrency(deal.hig_revenue)}</span></div>
                      <div><span className="text-gray-400">Premium: </span><span className="text-gray-700">{formatCurrency(deal.target_premium)}</span></div>
                      {deal.last_contact && (
                        <div><span className="text-gray-400">Contact: </span><span className="text-gray-700">{formatDate(deal.last_contact)}</span></div>
                      )}
                      {deal.sale_paid_date && (
                        <div className="col-span-2"><span className="text-gray-400">Paid: </span><span className="text-gray-700">{formatDate(deal.sale_paid_date)}</span></div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(deal)}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(deal.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {/* Mobile totals */}
            <div className="p-4 bg-gray-50 border-t-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Totals</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-gray-400">Revenue</p><p className="font-bold text-gray-900">{formatCurrency(visibleTotalRevenue)}</p></div>
                <div><p className="text-gray-400">HIG</p><p className="font-bold text-[#008B3D]">{formatCurrency(visibleHIG)}</p></div>
                <div><p className="text-gray-400">Premium</p><p className="font-bold text-gray-900">{formatCurrency(visiblePremium)}</p></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deals — Desktop Table */}
      <div className="hidden md:block card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleDeals.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No {view === 'active' ? 'active' : 'paid'} deals yet</p>
            <p className="text-sm mt-1">
              {view === 'active' ? 'Click "Add Deal" to get started' : 'Mark a deal as paid to move it here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Name', 'Stage', 'Total Revenue', 'Referral Split', 'HIG Revenue', 'Target Premium', 'Last Contact', 'Sale / Paid Date', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleDeals.map(deal => (
                  <tr key={deal.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{deal.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[deal.sales_stage] || 'bg-gray-100 text-gray-500'}`}>
                        {deal.sales_stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium tabular-nums">{formatCurrency(deal.total_revenue)}</td>
                    <td className="px-4 py-3 text-gray-600">{deal.referral_split || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-[#008B3D] tabular-nums">{formatCurrency(deal.hig_revenue)}</td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">{formatCurrency(deal.target_premium)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(deal.last_contact)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(deal.sale_paid_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(deal)} className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors" title="Edit deal">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(deal.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete deal">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Totals</td>
                  <td className="px-4 py-3 font-bold text-gray-900 tabular-nums">{formatCurrency(visibleTotalRevenue)}</td>
                  <td />
                  <td className="px-4 py-3 font-bold text-[#008B3D] tabular-nums">{formatCurrency(visibleHIG)}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 tabular-nums">{formatCurrency(visiblePremium)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Deal Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Edit Deal' : 'Add Deal'}</h2>
              <button onClick={closeForm} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Name *</label>
                  <input
                    className="input"
                    value={formData.name}
                    onChange={e => field('name', e.target.value)}
                    placeholder="Client or deal name"
                    required
                  />
                </div>
                <div>
                  <label className="label">Sales Stage</label>
                  <select className="select" value={formData.sales_stage} onChange={e => field('sales_stage', e.target.value)}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Referral Split (Name)</label>
                  <input
                    className="input"
                    value={formData.referral_split}
                    onChange={e => field('referral_split', e.target.value)}
                    placeholder="Referral partner name"
                  />
                </div>
                <div>
                  <label className="label">Total Revenue ($)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.total_revenue}
                    onChange={e => field('total_revenue', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">HIG Revenue ($)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.hig_revenue}
                    onChange={e => field('hig_revenue', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">Target Premium ($)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.target_premium}
                    onChange={e => field('target_premium', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">Last Contact</label>
                  <input
                    className="input"
                    type="date"
                    value={formData.last_contact}
                    onChange={e => field('last_contact', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Sale / Paid Date</label>
                  <input
                    className="input"
                    type="date"
                    value={formData.sale_paid_date}
                    onChange={e => field('sale_paid_date', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 bg-gray-50 rounded-lg px-4 py-3">
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 accent-teal-500"
                      checked={formData.is_paid}
                      onChange={e => field('is_paid', e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-700">Mark as Paid / Closed Deal</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1 ml-7">Moves this deal to the Paid Deals view</p>
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-gray-100">
                <div>
                  {editId && (
                    <button
                      type="button"
                      onClick={() => { const id = editId; closeForm(); setDeleteId(id); }}
                      className="btn-danger"
                    >
                      Delete Deal
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Deal'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        message="Are you sure you want to delete this deal? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
