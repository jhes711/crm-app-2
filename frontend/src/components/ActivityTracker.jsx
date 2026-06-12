import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Target, CheckCircle } from 'lucide-react';
import { getActivityTrackerWeek, getActivityTrackerMonth, upsertActivityTrackerRow } from '../utils/api';

export const WEEKLY_ACTIVITIES = [
  { key: 'bed_1030',         label: 'In Bed by 10:30pm',      pts: 1, goalPts: 5,  goalLabel: '5/wk' },
  { key: 'wake_500',         label: 'Wake up at 5:00am',       pts: 1, goalPts: 5,  goalLabel: '5/wk' },
  { key: 'exercise_weights', label: 'Exercise – Weights',      pts: 1, goalPts: 3,  goalLabel: '3/wk' },
  { key: 'exercise_cardio',  label: 'Exercise – Cardio/Core',  pts: 1, goalPts: 3,  goalLabel: '3/wk' },
  { key: 'appts_set',        label: 'Appointments Set',        pts: 1, goalPts: 3,  goalLabel: '3/wk',  type: 'count' },
  { key: 'appts_kept',       label: 'Appointments Kept',       pts: 1, goalPts: 3,  goalLabel: '3/wk',  type: 'count' },
  { key: 'case_open',        label: 'Case Open',               pts: 1, goalPts: 2,  goalLabel: '2/wk',  type: 'count' },
  { key: 'prospect',         label: 'Prospect',                pts: 1, goalPts: 15, goalLabel: '15/wk', type: 'count' },
  { key: 'qp',               label: 'QP / Qualified Prospect', pts: 1, goalPts: 3,  goalLabel: '3/wk',  type: 'count' },
  { key: 'submitted_biz',    label: 'Submitted Business',      pts: 5, goalPts: 5,  goalLabel: '1/wk',  type: 'count' },
  { key: 'read_book',        label: 'Read Book',               pts: 1, goalPts: 5,  goalLabel: '5/wk' },
];

export const MONTHLY_ACTIVITIES = [
  { key: 'pp_submitted', label: 'PP Submitted Business', pts: 10, monthlyGoalCount: 1, goalLabel: '1/mo', type: 'count' },
  { key: 'sales_made',   label: 'Sales Made',            pts: 2,  monthlyGoalCount: 2, goalLabel: '2/mo', type: 'count' },
  { key: 'sale_10k',     label: 'Sale of $10k+',         pts: 10, monthlyGoalCount: 1, goalLabel: '1/mo', type: 'count' },
];

export const WEEKLY_GOAL = 48;

const ALL_ACTIVITIES = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getSunday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return toDateStr(d);
}

function shiftWeek(weekStart, delta) {
  const [y, m, d] = weekStart.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + delta * 7));
}

function formatWeekRange(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

// Returns the month {year, month} that this week belongs to:
// majority of Mon-Sat days wins; tie goes to the later month.
function getWeekMonth(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number);
  const counts = {};
  for (let i = 1; i <= 6; i++) {
    const day = new Date(y, m - 1, d + i);
    const key = `${day.getFullYear()}-${day.getMonth() + 1}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  let winner = null, maxCount = 0;
  for (const key of Object.keys(counts).sort()) {
    if (counts[key] >= maxCount) { maxCount = counts[key]; winner = key; }
  }
  const [wy, wm] = winner.split('-').map(Number);
  return { year: wy, month: wm };
}

function formatMonthLabel(weekStart) {
  const { year, month } = getWeekMonth(weekStart);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const initGrid = () => {
  const g = {};
  ALL_ACTIVITIES.forEach(a => { g[a.key] = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 }; });
  return g;
};

const CheckIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export const ActivityTracker = ({ toast }) => {
  const [weekStart, setWeekStart] = useState(() => getSunday(new Date()));
  const [grid, setGrid] = useState(initGrid);
  const [loading, setLoading] = useState(false);
  const [monthRows, setMonthRows] = useState([]);

  useEffect(() => {
    setLoading(true);
    setGrid(initGrid());
    getActivityTrackerWeek(weekStart)
      .then(rows => {
        setGrid(prev => {
          const g = { ...prev };
          rows.forEach(row => {
            if (g[row.activity_key] !== undefined) {
              g[row.activity_key] = {
                sun: row.sun || 0, mon: row.mon || 0, tue: row.tue || 0,
                wed: row.wed || 0, thu: row.thu || 0, fri: row.fri || 0, sat: row.sat || 0,
              };
            }
          });
          return g;
        });
      })
      .catch(() => toast?.('Failed to load activity data', 'error'))
      .finally(() => setLoading(false));
  }, [weekStart]);

  // Load month data for the month this week belongs to (not simply the Sunday's calendar month)
  useEffect(() => {
    const { year, month } = getWeekMonth(weekStart);
    getActivityTrackerMonth(year, month).then(setMonthRows).catch(() => {});
  }, [weekStart]);

  const saveRow = async (actKey, updatedRow, prevRow) => {
    try {
      await upsertActivityTrackerRow(weekStart, actKey, updatedRow);
    } catch {
      toast?.('Save failed', 'error');
      setGrid(g => ({ ...g, [actKey]: prevRow }));
    }
  };

  const toggle = (actKey, day) => {
    const row = grid[actKey] ?? {};
    const prevRow = { ...row };
    const nextVal = (row[day] || 0) === 1 ? 0 : 1;
    const updatedRow = {
      sun: row.sun || 0, mon: row.mon || 0, tue: row.tue || 0,
      wed: row.wed || 0, thu: row.thu || 0, fri: row.fri || 0, sat: row.sat || 0,
      [day]: nextVal,
    };
    setGrid(g => ({ ...g, [actKey]: updatedRow }));
    saveRow(actKey, updatedRow, prevRow);
  };

  const setCount = (actKey, day, value) => {
    const count = Math.max(0, parseInt(value, 10) || 0);
    const row = grid[actKey] ?? {};
    const prevRow = { ...row };
    const updatedRow = {
      sun: row.sun || 0, mon: row.mon || 0, tue: row.tue || 0,
      wed: row.wed || 0, thu: row.thu || 0, fri: row.fri || 0, sat: row.sat || 0,
      [day]: count,
    };
    setGrid(g => ({ ...g, [actKey]: updatedRow }));
    saveRow(actKey, updatedRow, prevRow);
  };

  const getActivityPoints = (actKey) => {
    const a = ALL_ACTIVITIES.find(x => x.key === actKey);
    if (!a) return 0;
    return DAYS.reduce((s, d) => s + (grid[actKey]?.[d] || 0), 0) * a.pts;
  };

  // Daily totals only count weekly activities
  const getDayPoints = (day) =>
    WEEKLY_ACTIVITIES.reduce((s, a) => s + (grid[a.key]?.[day] || 0) * a.pts, 0);

  const grandTotal = WEEKLY_ACTIVITIES.reduce((s, a) => s + getActivityPoints(a.key), 0);
  const pct = Math.min(100, Math.round((grandTotal / WEEKLY_GOAL) * 100));
  const goalMet = grandTotal >= WEEKLY_GOAL;

  // Monthly total: other weeks from monthRows that belong to the same month + current week from grid.
  // Filtering by getWeekMonth ensures a week starting in month N but belonging to month N+1
  // (or vice versa) is not double-counted.
  const weekMonth = getWeekMonth(weekStart);
  const getMonthlyActivityTotal = (actKey) => {
    const otherWeeks = monthRows
      .filter(r => {
        if (r.activity_key !== actKey || r.week_start === weekStart) return false;
        const wm = getWeekMonth(r.week_start);
        return wm.year === weekMonth.year && wm.month === weekMonth.month;
      })
      .reduce((sum, r) => sum + DAYS.reduce((ds, d) => ds + (r[d] || 0), 0), 0);
    const currentWeek = DAYS.reduce((s, d) => s + (grid[actKey]?.[d] || 0), 0);
    return otherWeeks + currentWeek;
  };

  const renderDayCell = (a, day) => {
    if (a.type === 'count') {
      const count = grid[a.key]?.[day] || 0;
      return (
        <td key={day} className="px-1 py-2 text-center">
          <input
            type="number"
            min="0"
            value={count === 0 ? '' : count}
            onChange={e => setCount(a.key, day, e.target.value)}
            className="w-11 h-8 text-center text-sm font-semibold border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 bg-white tabular-nums"
            placeholder="0"
          />
        </td>
      );
    }
    const checked = Boolean(grid[a.key]?.[day]);
    return (
      <td key={day} className="px-2 py-2.5 text-center">
        <button
          onClick={() => toggle(a.key, day)}
          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center mx-auto transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 ${
            checked ? 'bg-teal-500 border-teal-500 shadow-sm' : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'
          }`}
          aria-label={`Toggle ${a.label} on ${day}`}
        >
          {checked && <CheckIcon />}
        </button>
      </td>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Weekly performance log — goal: {WEEKLY_GOAL} pts/week</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setWeekStart(s => shiftWeek(s, -1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm min-w-[200px] justify-center flex-1 sm:flex-none">
            <Calendar className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">{formatWeekRange(weekStart)}</span>
          </div>
          <button onClick={() => setWeekStart(getSunday(new Date()))}
            className="px-3 py-2 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition-colors whitespace-nowrap">
            This Week
          </button>
          <button onClick={() => setWeekStart(s => shiftWeek(s, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekly Progress Card */}
      <div className={`card ${goalMet ? 'border-green-200 bg-green-50/40' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {goalMet
              ? <CheckCircle className="w-5 h-5 text-[#008B3D]" />
              : <Target className="w-5 h-5 text-gray-400" />}
            <span className="font-semibold text-gray-900">Weekly Points Progress</span>
            {goalMet && (
              <span className="text-xs font-semibold text-[#008B3D] bg-green-100 px-2 py-0.5 rounded-full">Goal Achieved!</span>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold tabular-nums ${goalMet ? 'text-[#008B3D]' : 'text-gray-900'}`}>{grandTotal}</span>
            <span className="text-lg text-gray-400">/ {WEEKLY_GOAL} pts</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ease-out ${goalMet ? 'bg-[#008B3D]' : 'bg-[#EA501A]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {pct}% of weekly goal
          {!goalMet && grandTotal < WEEKLY_GOAL && ` — ${WEEKLY_GOAL - grandTotal} pts remaining`}
        </p>
      </div>

      {/* Weekly Activity Grid */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 min-w-[210px]">Activity</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-3 w-14">Pts</th>
                  {DAY_LABELS.map(d => (
                    <th key={d} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-3 w-16">{d}</th>
                  ))}
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 w-20">Earned</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 w-16">Goal</th>
                </tr>
              </thead>
              <tbody>
                {WEEKLY_ACTIVITIES.map(a => {
                  const earned = getActivityPoints(a.key);
                  const met = earned >= a.goalPts;
                  const partial = earned > 0 && !met;
                  return (
                    <tr key={a.key} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-gray-800">{a.label}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="inline-block text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {a.pts}pt{a.pts > 1 ? 's' : ''}
                        </span>
                      </td>
                      {DAYS.map(day => renderDayCell(a, day))}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-sm font-bold tabular-nums ${met ? 'text-[#008B3D]' : partial ? 'text-amber-600' : 'text-gray-300'}`}>
                          {earned}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-medium ${met ? 'text-[#008B3D]' : 'text-gray-400'}`}>
                          {a.goalLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-5 py-3 font-bold text-gray-800 text-xs uppercase tracking-wide">Daily Total</td>
                  <td />
                  {DAYS.map(day => (
                    <td key={day} className="px-2 py-3 text-center">
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{getDayPoints(day)}</span>
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center">
                    <span className={`text-sm font-bold tabular-nums ${goalMet ? 'text-[#008B3D]' : 'text-gray-900'}`}>{grandTotal}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs font-bold text-gray-500">{WEEKLY_GOAL}/wk</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Goals Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-gray-900">Monthly Goals</h2>
          <span className="text-sm font-medium text-gray-500">{formatMonthLabel(weekStart)}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Not included in weekly total</span>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5EDF9] border-b border-[#E8D5F2]">
                  <th className="text-left text-xs font-semibold text-[#632E84] uppercase tracking-wide px-5 py-3 min-w-[210px]">Activity</th>
                  <th className="text-center text-xs font-semibold text-[#632E84] uppercase tracking-wide px-2 py-3 w-14">Pts</th>
                  {DAY_LABELS.map(d => (
                    <th key={d} className="text-center text-xs font-semibold text-[#632E84] uppercase tracking-wide px-2 py-3 w-16">{d}</th>
                  ))}
                  <th className="text-center text-xs font-semibold text-[#632E84] uppercase tracking-wide px-3 py-3 w-24">This Week</th>
                  <th className="text-center text-xs font-semibold text-[#632E84] uppercase tracking-wide px-3 py-3 w-32">Month Total</th>
                  <th className="text-center text-xs font-semibold text-[#632E84] uppercase tracking-wide px-3 py-3 w-16">Goal</th>
                </tr>
              </thead>
              <tbody>
                {MONTHLY_ACTIVITIES.map(a => {
                  const weekCount = DAYS.reduce((s, d) => s + (grid[a.key]?.[d] || 0), 0);
                  const weekPts = weekCount * a.pts;
                  const monthCount = getMonthlyActivityTotal(a.key);
                  const monthPts = monthCount * a.pts;
                  const met = monthCount >= a.monthlyGoalCount;
                  return (
                    <tr key={a.key} className="border-b border-gray-50 hover:bg-[#F5EDF9]/30 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-gray-800">{a.label}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="inline-block text-xs font-bold text-[#632E84] bg-[#F5EDF9] px-2 py-0.5 rounded-full whitespace-nowrap">
                          {a.pts}pt{a.pts > 1 ? 's' : ''}
                        </span>
                      </td>
                      {DAYS.map(day => renderDayCell(a, day))}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-sm font-bold tabular-nums ${weekPts > 0 ? 'text-[#632E84]' : 'text-gray-300'}`}>
                          {weekPts > 0 ? `${weekPts}pts` : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-sm font-bold tabular-nums ${met ? 'text-[#008B3D]' : monthPts > 0 ? 'text-[#632E84]' : 'text-gray-300'}`}>
                            {monthPts > 0 ? `${monthPts}pts` : '—'}
                          </span>
                          <span className={`text-xs ${met ? 'text-[#008B3D] font-semibold' : 'text-gray-400'}`}>
                            {monthCount}/{a.monthlyGoalCount} {met ? '✓' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-medium ${met ? 'text-[#008B3D]' : 'text-gray-400'}`}>{a.goalLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
