import React, { useEffect, useState } from 'react';
import { getOpportunities } from '../utils/api';
import { formatCurrency, formatDate, getName, PRIORITY_COLORS, STAGE_COLORS, isOverdue } from '../utils/formatters';
import { DollarSign, Users, TrendingUp, AlertCircle, Bell } from 'lucide-react';

const STAGES_INDIVIDUAL = ['Prospect','QP','Appt.','Case Open','Closing','UW','Sale Made','Inactive','Not Interested'];
const STAGES_PLATFORM   = ['Prospect','QP','Appt.','Open','Closing','Due Diligence','Allocation','Inactive','Not Interested'];
const ALL_STAGES = [...new Set([...STAGES_INDIVIDUAL, ...STAGES_PLATFORM])];

export const Dashboard = ({ onEdit }) => {
  const [opps, setOpps] = useState([]);

  useEffect(() => { getOpportunities().then(setOpps); }, []);

  const totalRevenue = opps.reduce((s, r) => s + (r.potential_revenue || 0), 0);
  const totalAUM = opps.reduce((s, r) => s + (r.aum || 0), 0);
  const alerts = opps.filter(r => r.next_followup && isOverdue(r.next_followup) && !['Sale Made','Inactive','Not Interested'].includes(r.opp_process));

  const byStageCounts = ALL_STAGES.reduce((acc, s) => {
    acc[s] = opps.filter(r => r.opp_process === s).length;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your sales pipeline</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard icon={<Users className="w-5 h-5 text-blue-500"/>} label="Total Opportunities" value={opps.length} bg="bg-blue-50" />
        <SummaryCard icon={<DollarSign className="w-5 h-5 text-teal-500"/>} label="Total Potential Revenue" value={formatCurrency(totalRevenue)} bg="bg-teal-50" />
        <SummaryCard icon={<TrendingUp className="w-5 h-5 text-purple-500"/>} label="Total AUM" value={formatCurrency(totalAUM)} bg="bg-purple-50" />
        <SummaryCard icon={<AlertCircle className="w-5 h-5 text-orange-500"/>} label="Follow-Up Alerts" value={alerts.length} bg="bg-orange-50" />
      </div>

      {/* Stage Pipeline */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Pipeline by Stage</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {ALL_STAGES.filter(s => byStageCounts[s] > 0 || ['Prospect','QP','Appt.','Case Open','Closing'].includes(s)).map(stage => (
            <div key={stage} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${STAGE_COLORS[stage] || 'bg-gray-100 text-gray-600'}`}>{stage}</div>
              <p className="text-2xl font-bold text-gray-900">{byStageCounts[stage] || 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-Up Alerts */}
      {alerts.length > 0 && (
        <div className="card border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-orange-800">Follow-Up Alerts ({alerts.length})</h2>
          </div>
          <div className="space-y-2">
            {alerts.map(r => (
              <div key={r.id} className="flex items-start sm:items-center justify-between gap-2 bg-white rounded-lg px-4 py-3 border border-orange-200 cursor-pointer hover:bg-orange-50 transition-colors" onClick={() => onEdit(r)}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                  <span className="font-medium text-gray-900 text-sm">{getName(r)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STAGE_COLORS[r.opp_process]}`}>{r.opp_process}</span>
                </div>
                <span className="text-sm font-semibold text-orange-700 whitespace-nowrap">Due: {formatDate(r.next_followup)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Active Pipeline */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Pipeline</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Name','Type','Stage','Opp. Type','Revenue','Priority','Next Follow-Up'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opps.filter(r => !['Sale Made','Inactive','Not Interested'].includes(r.opp_process)).slice(0, 10).map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => onEdit(r)}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{getName(r)}</td>
                  <td className="py-3 pr-4 text-gray-500">{r.client_type}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[r.opp_process]}`}>{r.opp_process}</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{r.opp_type}</td>
                  <td className="py-3 pr-4 font-medium text-gray-900">{formatCurrency(r.potential_revenue)}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                  </td>
                  <td className={`py-3 text-sm ${r.next_followup && isOverdue(r.next_followup) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                    {formatDate(r.next_followup)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, bg }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  </div>
);
