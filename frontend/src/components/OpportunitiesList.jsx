import React, { useEffect, useState, useCallback } from 'react';
import { getOpportunities, deleteOpportunity } from '../utils/api';
import { formatCurrency, formatDate, getName, PRIORITY_COLORS, STAGE_COLORS, isOverdue } from '../utils/formatters';
import { Search, Plus, Pencil, Trash2, ChevronUp, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { ConfirmDialog } from './ui/ConfirmDialog';

const OPP_PROCESSES = ['Prospect','QP','Appt.','Case Open','Closing','UW','Sale Made','Inactive','Not Interested','Open','Due Diligence','Allocation'];
const OPP_TYPES = ['DVA','PPLI','Life','Annuity','P&C','Institutional'];

export const OpportunitiesList = ({ onAdd, onEdit, toast }) => {
  const [opps, setOpps] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ client_type: '', opp_process: '', opp_type: '', relationship: '', priority: '' });
  const [sortKey, setSortKey] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');

  const load = useCallback(() => {
    getOpportunities({ ...filters, search }).then(setOpps);
  }, [filters, search]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...opps].sort((a, b) => {
    let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
    if (sortKey === 'name') { av = getName(a); bv = getName(b); }
    if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const confirmDelete = (r) => { setDeleteId(r.id); setDeleteName(getName(r)); };
  const handleDelete = async () => {
    await deleteOpportunity(deleteId);
    toast('Record deleted', 'success');
    setDeleteId(null);
    load();
  };

  const clearFilters = () => setFilters({ client_type: '', opp_process: '', opp_type: '', relationship: '', priority: '' });
  const hasFilters = Object.values(filters).some(Boolean) || search;

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <ChevronDown className="w-3 h-3 opacity-30" />;

  const Th = ({ k, children }) => (
    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-3 cursor-pointer hover:text-gray-700 select-none" onClick={() => handleSort(k)}>
      <div className="flex items-center gap-1">{children}<SortIcon k={k} /></div>
    </th>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-gray-500 text-sm mt-0.5">{opps.length} record{opps.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onAdd} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Opportunity</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowFilters(s => !s)}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${showFilters ? 'bg-navy-900 text-white border-navy-900' : 'border-gray-200 text-gray-600 hover:border-teal-400'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 whitespace-nowrap">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { k: 'client_type', label: 'Client Type', opts: ['Individual','Institution','Platform'] },
            { k: 'opp_process', label: 'Opp. Process', opts: OPP_PROCESSES },
            { k: 'opp_type', label: 'Opp. Type', opts: OPP_TYPES },
            { k: 'relationship', label: 'Relationship', opts: ['Jerry','Tom','Jonathan','Jay','Andy'] },
            { k: 'priority', label: 'Priority', opts: ['High','Medium','Low'] }
          ].map(({ k, label, opts }) => (
            <div key={k}>
              <label className="label">{label}</label>
              <select className="select" value={filters[k]} onChange={e => setFilters(f => ({ ...f, [k]: e.target.value }))}>
                <option value="">All</option>
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden card p-0 overflow-hidden divide-y divide-gray-50">
        {sorted.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No opportunities found.</div>
        )}
        {sorted.map(r => (
          <div
            key={r.id}
            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onEdit(r)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{r.client_type.slice(0,4)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[r.opp_process] || 'bg-gray-100 text-gray-600'}`}>{r.opp_process}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-snug">{getName(r)}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                  {r.relationship && <span>{r.relationship}</span>}
                  {r.opp_type && <span>{r.opp_type}</span>}
                  {r.potential_revenue > 0 && <span className="font-medium text-gray-700">{formatCurrency(r.potential_revenue)}</span>}
                </div>
                {r.next_followup && (
                  <p className={`text-xs mt-1 ${isOverdue(r.next_followup) ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                    Follow-up: {formatDate(r.next_followup)}
                  </p>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); confirmDelete(r); }}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="px-6">
                <th className="pl-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-3 pt-4">Type</th>
                <Th k="name">Name</Th>
                <Th k="relationship">Relationship</Th>
                <Th k="opp_process">Stage</Th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-3">Opp. Type</th>
                <Th k="potential_revenue">Revenue</Th>
                <Th k="aum">AUM</Th>
                <Th k="last_contact">Last Contact</Th>
                <Th k="priority">Priority</Th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-3">Next Follow-Up</th>
                <th className="pb-3 pr-6"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">No opportunities found.</td></tr>
              )}
              {sorted.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group" onClick={() => onEdit(r)}>
                  <td className="pl-6 py-3.5 pr-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{r.client_type.slice(0,4)}</span>
                  </td>
                  <td className="py-3.5 pr-3 font-medium text-gray-900 whitespace-nowrap">{getName(r)}</td>
                  <td className="py-3.5 pr-3 text-gray-600">{r.relationship}</td>
                  <td className="py-3.5 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[r.opp_process] || 'bg-gray-100 text-gray-600'}`}>{r.opp_process}</span>
                  </td>
                  <td className="py-3.5 pr-3 text-gray-600">{r.opp_type}</td>
                  <td className="py-3.5 pr-3 font-medium text-gray-900">{formatCurrency(r.potential_revenue)}</td>
                  <td className="py-3.5 pr-3 text-gray-600">{formatCurrency(r.aum)}</td>
                  <td className="py-3.5 pr-3 text-gray-600">{formatDate(r.last_contact)}</td>
                  <td className="py-3.5 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                  </td>
                  <td className={`py-3.5 pr-3 text-sm ${r.next_followup && isOverdue(r.next_followup) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                    {formatDate(r.next_followup)}
                  </td>
                  <td className="py-3.5 pr-6">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onEdit(r)} className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => confirmDelete(r)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        message={`Are you sure you want to delete "${deleteName}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
