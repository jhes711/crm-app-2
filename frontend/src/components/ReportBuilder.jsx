import React, { useState, useCallback } from 'react';
import { getReport } from '../utils/api';
import { formatCurrency, formatDate, getName, PRIORITY_COLORS, STAGE_COLORS } from '../utils/formatters';
import { FileSpreadsheet, FileText, Search } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exporters';

const OPP_PROCESSES = ['Prospect','QP','Appt.','Case Open','Closing','UW','Sale Made','Inactive','Not Interested','Open','Due Diligence','Allocation'];
const OPP_TYPES = ['DVA','PPLI','Life','Annuity','P&C','Institutional'];

export const ReportBuilder = ({ toast }) => {
  const [filters, setFilters] = useState({ opp_process: 'all', client_type: '', opp_type: '', relationship: '', priority: '', date_from: '', date_to: '', sort: 'name_asc' });
  const [data, setData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const runReport = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getReport(filters);
      setData(rows);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const totalRevenue = data.reduce((s, r) => s + (r.potential_revenue || 0), 0);
  const totalAUM = data.reduce((s, r) => s + (r.aum || 0), 0);

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([k,v]) => v && v !== 'all' && k !== 'sort'));

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
        <p className="text-gray-500 text-sm mt-1">Build custom reports and export to Excel or PDF</p>
      </div>

      {/* Filters */}
      <div className="card space-y-5">
        <h2 className="font-semibold text-gray-900">Filters</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Opp. Process</label>
            <select className="select" value={filters.opp_process} onChange={e => set('opp_process', e.target.value)}>
              <option value="all">All Stages</option>
              {OPP_PROCESSES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Client Type</label>
            <select className="select" value={filters.client_type} onChange={e => set('client_type', e.target.value)}>
              <option value="">All Types</option>
              {['Individual','Institution','Platform'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Opp. Type</label>
            <select className="select" value={filters.opp_type} onChange={e => set('opp_type', e.target.value)}>
              <option value="">All</option>
              {OPP_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Relationship</label>
            <select className="select" value={filters.relationship} onChange={e => set('relationship', e.target.value)}>
              <option value="">All</option>
              {['Jerry','Tom','Jonathan','Jay','Andy'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="select" value={filters.priority} onChange={e => set('priority', e.target.value)}>
              <option value="">All</option>
              {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Last Contact From</label>
            <input type="date" className="input" value={filters.date_from} onChange={e => set('date_from', e.target.value)} />
          </div>
          <div>
            <label className="label">Last Contact To</label>
            <input type="date" className="input" value={filters.date_to} onChange={e => set('date_to', e.target.value)} />
          </div>
          <div>
            <label className="label">Sort By</label>
            <select className="select" value={filters.sort} onChange={e => set('sort', e.target.value)}>
              <option value="name_asc">Name A–Z</option>
              <option value="referred_by">Referred By</option>
              <option value="relationship">Relationship</option>
              <option value="revenue_desc">Revenue (High to Low)</option>
              <option value="last_contact_desc">Last Contact (Recent First)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={runReport} disabled={loading} className="btn-primary flex items-center gap-2">
            <Search className="w-4 h-4" /> {loading ? 'Running...' : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Results */}
      {loaded && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm"><span className="font-semibold text-gray-900">{data.length}</span> records found</p>
            <div className="flex items-center gap-3">
              <button onClick={() => { exportToExcel(data, activeFilters); toast('Exported to Excel', 'success'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </button>
              <button onClick={() => { exportToPDF(data, activeFilters); toast('Exported to PDF', 'success'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-medium transition-colors">
                <FileText className="w-4 h-4" /> Export PDF
              </button>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    {['Type','Name','Referred By','Relationship','Opp. Process','Opp. Type','Potential Revenue','AUM','Last Contact','Priority','Next Follow-Up'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-10 text-gray-400">No records match the selected filters.</td></tr>
                  )}
                  {data.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{r.client_type.slice(0,4)}</span></td>
                      <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{getName(r)}</td>
                      <td className="py-3 px-4 text-gray-600">{r.referred_by || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{r.relationship}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[r.opp_process]}`}>{r.opp_process}</span></td>
                      <td className="py-3 px-4 text-gray-600">{r.opp_type}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{formatCurrency(r.potential_revenue)}</td>
                      <td className="py-3 px-4 text-gray-600">{formatCurrency(r.aum)}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(r.last_contact)}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span></td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(r.next_followup)}</td>
                    </tr>
                  ))}
                </tbody>
                {data.length > 0 && (
                  <tfoot className="border-t-2 border-gray-200 bg-slate-50">
                    <tr>
                      <td colSpan={6} className="py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Totals ({data.length} records)</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(totalRevenue)}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(totalAUM)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
