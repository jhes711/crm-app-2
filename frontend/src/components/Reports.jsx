import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Target, CheckCircle, TrendingUp, BarChart2, FileSpreadsheet, FileText, Search, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getActivityTrackerWeek, getActivityTrackerMonth, getDeals, getReport } from '../utils/api';
import { formatCurrency, formatDate, getName, PRIORITY_COLORS, STAGE_COLORS } from '../utils/formatters';
import { exportToExcel, exportToPDF } from '../utils/exporters';
import { WEEKLY_ACTIVITIES, MONTHLY_ACTIVITIES, WEEKLY_GOAL } from './ActivityTracker';

const ANNUAL_HIG_GOAL = 500_000;
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEAL_STAGE_COLORS = {
  UW:       'bg-[#FFF4EE] text-[#EA501A]',
  CO:       'bg-yellow-100 text-[#8B6A00]',
  Sale:     'bg-green-100 text-[#008B3D]',
  Inactive: 'bg-gray-100 text-gray-500',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
function shiftMonth({ year, month }, delta) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  return { year: y, month: m };
}
function formatWeekRange(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}
function formatMonthName({ year, month }) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
// Returns week starts (Sundays) whose Mon-Sat majority belongs to {year, month}.
// No week is split: it appears in exactly one monthly report.
function getWeeksInMonth(year, month) {
  // Search from 2 weeks before the month through 2 weeks after, then filter by getWeekMonth.
  const cur = new Date(year, month - 1, 1 - 14);
  cur.setDate(cur.getDate() - cur.getDay()); // back to Sunday
  const searchEnd = new Date(year, month, 0 + 14);
  const weeks = [];
  while (cur <= searchEnd) {
    const ws = toDateStr(new Date(cur));
    const wm = getWeekMonth(ws);
    if (wm.year === year && wm.month === month) weeks.push(ws);
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}
function isDateInWeek(dateStr, weekStart) {
  if (!dateStr) return false;
  const d = new Date(dateStr.substring(0, 10));
  const [y, m, day] = weekStart.split('-').map(Number);
  const start = new Date(y, m - 1, day);
  const end = new Date(y, m - 1, day + 6);
  return d >= start && d <= end;
}
function isDateInMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = new Date(dateStr.substring(0, 10));
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}
// Returns the month {year, month} that a week (Sun-Sat) belongs to:
// the month containing the majority of Mon-Sat days; ties go to the later month.
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
function rowDayTotal(row) {
  return DAYS.reduce((s, d) => s + (row?.[d] || 0), 0);
}
function weeklyPtsFromRows(rows) {
  return WEEKLY_ACTIVITIES.reduce((sum, a) => {
    const row = rows.find(r => r.activity_key === a.key);
    return sum + (row ? rowDayTotal(row) * a.pts : 0);
  }, 0);
}

// ─── PDF export helpers ───────────────────────────────────────────────────────

const PDF_DARK   = [15, 23, 42];
const PDF_TEAL   = [20, 184, 166];
const PDF_PURPLE = [88, 28, 135];
const PDF_ALT    = [248, 250, 252];
const PDF_TOTAL  = [226, 232, 240];

function pdfHeader(doc, title, subtitle) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...PDF_DARK);
  doc.text(title, 40, 40);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(80, 80, 80);
  doc.text(subtitle, 40, 58);
  doc.setFontSize(9); doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 40, 73);
}

function pdfProgressBar(doc, label, value, max, color = PDF_TEAL) {
  const W = doc.internal.pageSize.getWidth();
  const barW = W - 80;
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...PDF_DARK);
  doc.text(`${label}: ${pct}%`, 40, 91);
  doc.setFillColor(226, 232, 240); doc.rect(40, 97, barW, 8, 'F');
  if (value > 0) { doc.setFillColor(...color); doc.rect(40, 97, barW * Math.min(1, value / max), 8, 'F'); }
  return 113; // Y after bar
}

function exportActivityPDF(view, { weekStart, weekRows, weeklyTotal, weeklyPct, my, monthRows, weeksInMonth, monthlyTotal, monthlyGoal, monthlyPct }) {
  if (view === 'weekly') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    pdfHeader(doc, 'Activity Report', `Week of ${formatWeekRange(weekStart)}`);
    let y = pdfProgressBar(doc, `Weekly Points: ${weeklyTotal} / ${WEEKLY_GOAL} pts`, weeklyTotal, WEEKLY_GOAL);

    const head = [['Activity', 'Pts', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Earned', 'Goal %']];
    const body = WEEKLY_ACTIVITIES.map(a => {
      const row = weekRows.find(r => r.activity_key === a.key);
      const earned = row ? rowDayTotal(row) * a.pts : 0;
      const pct = Math.min(100, Math.round((earned / a.goalPts) * 100));
      return [a.label, `${a.pts}pt${a.pts > 1 ? 's' : ''}`, ...DAYS.map(day => { const v = row?.[day] || 0; return v > 0 ? String(v) : '·'; }), String(earned), `${pct}%`];
    });
    const dayTotals = DAYS.map(day => String(WEEKLY_ACTIVITIES.reduce((s, a) => s + (weekRows.find(r => r.activity_key === a.key)?.[day] || 0) * a.pts, 0)));
    body.push(['Daily Total', '', ...dayTotals, String(weeklyTotal), '']);

    autoTable(doc, {
      head, body, startY: y,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PDF_DARK, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: PDF_ALT },
      columnStyles: { 0: { cellWidth: 130 } },
      didParseCell: d => { if (d.row.index === body.length - 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = PDF_TOTAL; } },
    });

    const mY = doc.lastAutoTable.finalY + 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...PDF_DARK);
    doc.text('Monthly Goal Entries This Week', 40, mY);
    autoTable(doc, {
      head: [['Activity', 'Pts Each', 'This Week', 'Monthly Goal']],
      body: MONTHLY_ACTIVITIES.map(a => {
        const row = weekRows.find(r => r.activity_key === a.key);
        const count = row ? rowDayTotal(row) : 0;
        return [a.label, `${a.pts}pts`, count > 0 ? `${count} × ${a.pts}pts = ${count * a.pts}pts` : '—', `${a.monthlyGoalCount}/mo`];
      }),
      startY: mY + 8,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PDF_PURPLE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: PDF_ALT },
    });
    doc.save(`Activity_Report_Weekly_${weekStart}.pdf`);

  } else {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const label = formatMonthName(my);
    pdfHeader(doc, 'Activity Report', label);
    let y = pdfProgressBar(doc, `Monthly Points: ${monthlyTotal} / ${monthlyGoal} pts`, monthlyTotal, monthlyGoal);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`${weeksInMonth.length} weeks × ${WEEKLY_GOAL}pt goal = ${monthlyGoal}pt target`, 40, y);
    y += 12;

    const weekBody = weeksInMonth.map(ws => {
      const pts = weeklyPtsFromRows(monthRows.filter(r => r.week_start === ws));
      return [formatWeekRange(ws), String(pts), String(WEEKLY_GOAL), `${Math.min(100, Math.round((pts / WEEKLY_GOAL) * 100))}%`];
    });
    weekBody.push(['Monthly Total', String(monthlyTotal), String(monthlyGoal), `${monthlyPct}%`]);
    autoTable(doc, {
      head: [['Week', 'Points', 'Goal', '%']], body: weekBody, startY: y,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PDF_DARK, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: PDF_ALT },
      columnStyles: { 0: { cellWidth: 185 } },
      didParseCell: d => { if (d.row.index === weekBody.length - 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = PDF_TOTAL; } },
    });

    const aY = doc.lastAutoTable.finalY + 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...PDF_DARK);
    doc.text(`Activity Totals — ${label}`, 40, aY);
    autoTable(doc, {
      head: [['Activity', 'Pts', 'Count', 'Earned', 'Mo. Goal', '%']],
      body: WEEKLY_ACTIVITIES.map(a => {
        const count = monthRows.filter(r => r.activity_key === a.key && weeksInMonth.includes(r.week_start)).reduce((s, r) => s + rowDayTotal(r), 0);
        const pts = count * a.pts;
        const goalPts = a.goalPts * weeksInMonth.length;
        return [a.label, `${a.pts}pt${a.pts > 1 ? 's' : ''}`, String(count), String(pts), `${goalPts}pts`, `${Math.min(100, goalPts > 0 ? Math.round((pts / goalPts) * 100) : 0)}%`];
      }),
      startY: aY + 8,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PDF_DARK, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: PDF_ALT },
      columnStyles: { 0: { cellWidth: 155 } },
    });

    const mgY = doc.lastAutoTable.finalY + 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...PDF_DARK);
    doc.text('Monthly Goals', 40, mgY);
    autoTable(doc, {
      head: [['Activity', 'Pts Each', 'Occurrences', 'Pts Earned', 'Goal Pts', 'Status']],
      body: MONTHLY_ACTIVITIES.map(a => {
        const count = monthRows.filter(r => r.activity_key === a.key && weeksInMonth.includes(r.week_start)).reduce((s, r) => s + rowDayTotal(r), 0);
        const pts = count * a.pts;
        const goalPts = a.monthlyGoalCount * a.pts;
        return [a.label, `${a.pts}pts`, String(count), `${pts}pts`, `${goalPts}pts`, count >= a.monthlyGoalCount ? '✓ Goal Met' : `${a.monthlyGoalCount - count} remaining`];
      }),
      startY: mgY + 8,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PDF_PURPLE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: PDF_ALT },
      columnStyles: { 0: { cellWidth: 155 } },
    });
    doc.save(`Activity_Report_Monthly_${my.year}-${String(my.month).padStart(2, '0')}.pdf`);
  }
}

function exportCompensationPDF(view, { weekStart, my, deals, allHIG, higPct, weeksInMonth }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const subtitle = view === 'weekly' ? `Week of ${formatWeekRange(weekStart)}` : formatMonthName(my);
  pdfHeader(doc, 'Compensation Report', subtitle);
  pdfProgressBar(doc, `Annual HIG Revenue Goal: ${formatCurrency(allHIG)} / ${formatCurrency(ANNUAL_HIG_GOAL)}`, allHIG, ANNUAL_HIG_GOAL);

  const activeDeals = deals.filter(d => !d.is_paid);
  const paidDeals  = deals.filter(d => d.is_paid);
  const dealDate   = d => (d.sale_paid_date || d.created_at)?.substring(0, 10);
  const dealRow    = d => [d.name, d.sales_stage || '—', formatCurrency(d.total_revenue), formatCurrency(d.hig_revenue), d.referral_split || '—', formatDate(dealDate(d))];
  const totalsRow  = ds => ['Totals', '', formatCurrency(ds.reduce((s, d) => s + (d.total_revenue || 0), 0)), formatCurrency(ds.reduce((s, d) => s + (d.hig_revenue || 0), 0)), '', ''];
  const dealHead   = [['Name', 'Stage', 'Total Revenue', 'HIG Revenue', 'Referral Split', 'Date']];

  const aR = activeDeals.reduce((s, d) => s + (d.total_revenue || 0), 0);
  const aH = activeDeals.reduce((s, d) => s + (d.hig_revenue || 0), 0);
  const pR = paidDeals.reduce((s, d)  => s + (d.total_revenue || 0), 0);
  const pH = paidDeals.reduce((s, d)  => s + (d.hig_revenue || 0), 0);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
  doc.text(`Active Pipeline: ${activeDeals.length} deals | ${formatCurrency(aR)} total | ${formatCurrency(aH)} HIG`, 40, 120);
  doc.text(`Paid / Closed (All Time): ${paidDeals.length} deals | ${formatCurrency(pR)} total | ${formatCurrency(pH)} HIG`, 40, 133);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...PDF_DARK);
  doc.text('Active Pipeline', 40, 148);
  const activeBody = activeDeals.length > 0 ? [...activeDeals.map(dealRow), totalsRow(activeDeals)] : [['No active deals', '', '', '', '', '']];
  autoTable(doc, {
    head: dealHead, body: activeBody, startY: 156,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: PDF_DARK, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: PDF_ALT },
    columnStyles: { 0: { cellWidth: 150 } },
    didParseCell: d => { if (activeDeals.length > 0 && d.row.index === activeBody.length - 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = PDF_TOTAL; } },
  });

  if (view === 'weekly') {
    const periodDeals = paidDeals.filter(d => isDateInWeek(dealDate(d), weekStart));
    const pY = doc.lastAutoTable.finalY + 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...PDF_DARK);
    doc.text(`Paid Deals — ${formatWeekRange(weekStart)}`, 40, pY);
    const pBody = periodDeals.length > 0 ? [...periodDeals.map(dealRow), totalsRow(periodDeals)] : [['No paid deals this week', '', '', '', '', '']];
    autoTable(doc, {
      head: dealHead, body: pBody, startY: pY + 8,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: PDF_ALT },
      columnStyles: { 0: { cellWidth: 150 } },
      didParseCell: d => { if (periodDeals.length > 0 && d.row.index === pBody.length - 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = PDF_TOTAL; } },
    });
  } else {
    const colors = [[5,150,105],[2,132,199],[124,58,237],[217,119,6],[220,38,38]];
    const allPeriod = [];
    weeksInMonth.forEach((ws, idx) => {
      const wDs = paidDeals.filter(d => isDateInWeek(dealDate(d), ws));
      if (!wDs.length) return;
      allPeriod.push(...wDs);
      const wY = doc.lastAutoTable.finalY + 14;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...PDF_DARK);
      doc.text(`Paid Deals — ${formatWeekRange(ws)}`, 40, wY);
      const wBody = [...wDs.map(dealRow), totalsRow(wDs)];
      autoTable(doc, {
        head: dealHead, body: wBody, startY: wY + 8,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: colors[idx % colors.length], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: PDF_ALT },
        columnStyles: { 0: { cellWidth: 150 } },
        didParseCell: d => { if (d.row.index === wBody.length - 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = PDF_TOTAL; } },
      });
    });
    if (allPeriod.length) {
      const sY = doc.lastAutoTable.finalY + 16;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...PDF_DARK);
      doc.text(`Monthly Revenue Summary — ${formatMonthName(my)}`, 40, sY);
      autoTable(doc, {
        head: [['Metric', 'Value']],
        body: [['Total Revenue', formatCurrency(allPeriod.reduce((s, d) => s + (d.total_revenue || 0), 0))], ['HIG Revenue', formatCurrency(allPeriod.reduce((s, d) => s + (d.hig_revenue || 0), 0))], ['Deals Closed', String(allPeriod.length)]],
        startY: sY + 8,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: PDF_DARK, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: PDF_ALT },
        columnStyles: { 0: { cellWidth: 180 } },
      });
    }
  }

  const fname = view === 'weekly'
    ? `Compensation_Report_Weekly_${weekStart}.pdf`
    : `Compensation_Report_Monthly_${my.year}-${String(my.month).padStart(2, '0')}.pdf`;
  doc.save(fname);
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function ProgressBar({ value, max, color = 'teal', size = 'md' }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const fill = color === 'purple' ? 'bg-[#632E84]' : 'bg-[#EA501A]';
  return (
    <div className={`w-full bg-gray-200 rounded-full ${h} overflow-hidden`}>
      <div className={`${h} rounded-full transition-all duration-500 ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function WeekNav({ weekStart, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={() => onChange(shiftWeek(weekStart, -1))}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm min-w-[190px] justify-center flex-1 sm:flex-none">
        <Calendar className="w-4 h-4 text-teal-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700">{formatWeekRange(weekStart)}</span>
      </div>
      <button onClick={() => onChange(getSunday(new Date()))}
        className="px-3 py-2 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition-colors whitespace-nowrap">
        This Week
      </button>
      <button onClick={() => onChange(shiftWeek(weekStart, 1))}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function MonthNav({ my, onChange }) {
  const now = new Date();
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(shiftMonth(my, -1))}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm min-w-[175px] justify-center">
        <Calendar className="w-4 h-4 text-teal-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700">{formatMonthName(my)}</span>
      </div>
      <button onClick={() => onChange({ year: now.getFullYear(), month: now.getMonth() + 1 })}
        className="px-3 py-2 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition-colors">
        This Month
      </button>
      <button onClick={() => onChange(shiftMonth(my, 1))}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      {['weekly', 'monthly'].map(v => (
        <button key={v} onClick={() => onChange(v)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
            view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          {v}
        </button>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Activity Report ──────────────────────────────────────────────────────────

const ActivityReport = ({ toast }) => {
  const [view, setView] = useState('weekly');
  const [weekStart, setWeekStart] = useState(() => getSunday(new Date()));
  const [my, setMy] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() + 1 }; });
  const [weekRows, setWeekRows] = useState([]);
  const [monthRows, setMonthRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (view !== 'weekly') return;
    setLoading(true);
    getActivityTrackerWeek(weekStart)
      .then(setWeekRows)
      .catch(() => toast?.('Failed to load data', 'error'))
      .finally(() => setLoading(false));
  }, [view, weekStart]);

  useEffect(() => {
    if (view !== 'monthly') return;
    setLoading(true);
    getActivityTrackerMonth(my.year, my.month)
      .then(setMonthRows)
      .catch(() => toast?.('Failed to load data', 'error'))
      .finally(() => setLoading(false));
  }, [view, my]);

  // ── Weekly calculations ──
  const weeklyTotal = weeklyPtsFromRows(weekRows);
  const weeklyPct = Math.min(100, Math.round((weeklyTotal / WEEKLY_GOAL) * 100));
  const weekGoalMet = weeklyTotal >= WEEKLY_GOAL;

  const getWeekDayVal = (actKey, day) => weekRows.find(r => r.activity_key === actKey)?.[day] || 0;

  const getWeekActivityPts = (actKey) => {
    const a = WEEKLY_ACTIVITIES.find(x => x.key === actKey);
    const row = weekRows.find(r => r.activity_key === actKey);
    return a && row ? rowDayTotal(row) * a.pts : 0;
  };

  const getWeekDayTotal = (day) =>
    WEEKLY_ACTIVITIES.reduce((s, a) => {
      return s + (weekRows.find(r => r.activity_key === a.key)?.[day] || 0) * a.pts;
    }, 0);

  // ── Monthly calculations ──
  const weeksInMonth = getWeeksInMonth(my.year, my.month);

  const getWeekTotalFromRows = (ws) =>
    weeklyPtsFromRows(monthRows.filter(r => r.week_start === ws));

  const monthlyTotal = weeksInMonth.reduce((s, ws) => s + getWeekTotalFromRows(ws), 0);
  const monthlyGoal = weeksInMonth.length * WEEKLY_GOAL;
  const monthlyPct = Math.min(100, monthlyGoal > 0 ? Math.round((monthlyTotal / monthlyGoal) * 100) : 0);

  const getMonthlyCount = (actKey) =>
    monthRows.filter(r => r.activity_key === actKey).reduce((s, r) => s + rowDayTotal(r), 0);

  const getMonthlyPts = (actKey) => {
    const a = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find(x => x.key === actKey);
    return a ? getMonthlyCount(actKey) * a.pts : 0;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <ViewToggle view={view} onChange={setView} />
        <div className="flex items-center gap-3 flex-wrap">
          {view === 'weekly'
            ? <WeekNav weekStart={weekStart} onChange={setWeekStart} />
            : <MonthNav my={my} onChange={setMy} />}
          <button
            onClick={() => exportActivityPDF(view, { weekStart, weekRows, weeklyTotal, weeklyPct, my, monthRows, weeksInMonth, monthlyTotal, monthlyGoal, monthlyPct })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : view === 'weekly' ? (
        <>
          {/* Weekly progress */}
          <div className={`card ${weekGoalMet ? 'border-green-200 bg-green-50/40' : ''}`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {weekGoalMet ? <CheckCircle className="w-5 h-5 text-[#008B3D]" /> : <Target className="w-5 h-5 text-gray-400" />}
                <span className="font-semibold text-gray-900">Weekly Points — {formatWeekRange(weekStart)}</span>
                {weekGoalMet && <span className="text-xs font-semibold text-[#008B3D] bg-green-100 px-2 py-0.5 rounded-full">Goal Achieved!</span>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold tabular-nums ${weekGoalMet ? 'text-[#008B3D]' : 'text-gray-900'}`}>{weeklyTotal}</span>
                <span className="text-lg text-gray-400">/ {WEEKLY_GOAL} pts</span>
                <span className="text-sm text-gray-400 ml-1">({weeklyPct}%)</span>
              </div>
            </div>
            <ProgressBar value={weeklyTotal} max={WEEKLY_GOAL} />
            {!weekGoalMet && weeklyTotal < WEEKLY_GOAL && (
              <p className="text-xs text-gray-400 mt-1.5">{WEEKLY_GOAL - weeklyTotal} pts remaining to hit goal</p>
            )}
          </div>

          {/* Weekly activity table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 min-w-[200px]">Activity</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-3 w-12">Pts</th>
                    {DAY_LABELS.map(d => (
                      <th key={d} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 py-3 w-14">{d}</th>
                    ))}
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 w-20">Earned</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 w-20">Goal</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 w-28">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {WEEKLY_ACTIVITIES.map(a => {
                    const earned = getWeekActivityPts(a.key);
                    const met = earned >= a.goalPts;
                    const pct = Math.min(100, Math.round((earned / a.goalPts) * 100));
                    return (
                      <tr key={a.key} className="border-b border-gray-50 hover:bg-gray-50/60">
                        <td className="px-5 py-2.5 font-medium text-gray-800">{a.label}</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {a.pts}pt{a.pts > 1 ? 's' : ''}
                          </span>
                        </td>
                        {DAYS.map(day => {
                          const val = getWeekDayVal(a.key, day);
                          return (
                            <td key={day} className="px-1 py-2.5 text-center">
                              {a.type === 'count' ? (
                                <span className={`text-sm font-bold tabular-nums ${val > 0 ? 'text-[#008B3D]' : 'text-gray-200'}`}>
                                  {val > 0 ? val : '·'}
                                </span>
                              ) : (
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${val ? 'bg-teal-500 text-white' : 'text-gray-200'}`}>
                                  {val ? '✓' : '·'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-sm font-bold tabular-nums ${met ? 'text-[#008B3D]' : earned > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                            {earned}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-400 font-medium">{a.goalPts}pts</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-1.5 rounded-full ${met ? 'bg-[#008B3D]' : 'bg-[#EA501A]'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-xs tabular-nums w-7 text-right ${met ? 'text-[#008B3D] font-semibold' : 'text-gray-400'}`}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-5 py-3 text-xs font-bold text-gray-800 uppercase tracking-wide">Daily Total</td>
                    <td />
                    {DAYS.map(day => (
                      <td key={day} className="px-1 py-3 text-center">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{getWeekDayTotal(day)}</span>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      <span className={`text-sm font-bold tabular-nums ${weekGoalMet ? 'text-[#008B3D]' : 'text-gray-900'}`}>{weeklyTotal}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-gray-500">{WEEKLY_GOAL}pts</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly goal entries this week */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Monthly Goal Entries This Week</h3>
            <div className="divide-y divide-gray-50">
              {MONTHLY_ACTIVITIES.map(a => {
                const row = weekRows.find(r => r.activity_key === a.key);
                const count = row ? rowDayTotal(row) : 0;
                const pts = count * a.pts;
                return (
                  <div key={a.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.pts}pts each · monthly goal: {a.monthlyGoalCount}/mo</p>
                    </div>
                    <div className="text-right">
                      {count > 0 ? (
                        <p className="text-base font-bold text-[#632E84]">{count}× = {pts}pts</p>
                      ) : (
                        <p className="text-sm text-gray-300">No entries this week</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Monthly view */
        <>
          {/* Monthly summary */}
          <div className={`card ${monthlyTotal >= monthlyGoal ? 'border-green-200 bg-green-50/40' : ''}`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {monthlyTotal >= monthlyGoal ? <CheckCircle className="w-5 h-5 text-[#008B3D]" /> : <Target className="w-5 h-5 text-gray-400" />}
                <span className="font-semibold text-gray-900">Monthly Points — {formatMonthName(my)}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold tabular-nums ${monthlyTotal >= monthlyGoal ? 'text-[#008B3D]' : 'text-gray-900'}`}>{monthlyTotal}</span>
                <span className="text-lg text-gray-400">/ {monthlyGoal} pts</span>
                <span className="text-sm text-gray-400 ml-1">({monthlyPct}%)</span>
              </div>
            </div>
            <ProgressBar value={monthlyTotal} max={monthlyGoal} size="md" />
            <p className="text-xs text-gray-400 mt-1.5">{weeksInMonth.length} weeks × {WEEKLY_GOAL}pt goal = {monthlyGoal}pt monthly target</p>
          </div>

          {/* Week-by-week breakdown */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Week-by-Week Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-2.5">Week</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-2.5">Pts</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-2.5">Goal</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-2.5 w-40">Progress</th>
                </tr>
              </thead>
              <tbody>
                {weeksInMonth.map(ws => {
                  const pts = getWeekTotalFromRows(ws);
                  const wpct = Math.min(100, Math.round((pts / WEEKLY_GOAL) * 100));
                  const met = pts >= WEEKLY_GOAL;
                  return (
                    <tr key={ws} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="px-5 py-3 text-gray-700 font-medium">{formatWeekRange(ws)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-bold tabular-nums ${met ? 'text-[#008B3D]' : pts > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{pts}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-400">{WEEKLY_GOAL}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${met ? 'bg-[#008B3D]' : 'bg-[#EA501A]'}`} style={{ width: `${wpct}%` }} />
                          </div>
                          <span className={`text-xs tabular-nums w-8 ${met ? 'text-[#008B3D] font-semibold' : 'text-gray-400'}`}>{wpct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-5 py-3 text-xs font-bold text-gray-800 uppercase tracking-wide">Monthly Total</td>
                  <td className="px-5 py-3 text-right font-bold tabular-nums text-gray-900">{monthlyTotal}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-500">{monthlyGoal}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold tabular-nums ${monthlyTotal >= monthlyGoal ? 'text-[#008B3D]' : 'text-gray-600'}`}>{monthlyPct}%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Per-activity monthly totals */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Activity Totals — {formatMonthName(my)}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-2.5">Activity</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5">Count</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5">Pts Earned</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5">Mo. Goal</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5 w-32">Progress</th>
                </tr>
              </thead>
              <tbody>
                {WEEKLY_ACTIVITIES.map(a => {
                  const count = getMonthlyCount(a.key);
                  const pts = getMonthlyPts(a.key);
                  const goalPts = a.goalPts * weeksInMonth.length;
                  const apct = Math.min(100, goalPts > 0 ? Math.round((pts / goalPts) * 100) : 0);
                  const met = pts >= goalPts;
                  return (
                    <tr key={a.key} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="px-5 py-2.5 font-medium text-gray-800">{a.label}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{count}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-bold tabular-nums ${met ? 'text-[#008B3D]' : pts > 0 ? 'text-amber-600' : 'text-gray-300'}`}>{pts}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{goalPts}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${met ? 'bg-[#008B3D]' : 'bg-[#EA501A]'}`} style={{ width: `${apct}%` }} />
                          </div>
                          <span className={`text-xs tabular-nums w-8 ${met ? 'text-[#008B3D] font-semibold' : 'text-gray-400'}`}>{apct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Monthly goal tracking */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-5">Monthly Goals — {formatMonthName(my)}</h3>
            <div className="space-y-5">
              {MONTHLY_ACTIVITIES.map(a => {
                const count = getMonthlyCount(a.key);
                const pts = getMonthlyPts(a.key);
                const goalPts = a.monthlyGoalCount * a.pts;
                const gpct = Math.min(100, goalPts > 0 ? Math.round((pts / goalPts) * 100) : 0);
                const met = count >= a.monthlyGoalCount;
                return (
                  <div key={a.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {met ? <CheckCircle className="w-4 h-4 text-[#008B3D]" /> : <Target className="w-4 h-4 text-gray-300" />}
                        <span className="text-sm font-medium text-gray-800">{a.label}</span>
                        {met && <span className="text-xs font-semibold text-[#008B3D] bg-green-50 px-2 py-0.5 rounded-full">Goal Met!</span>}
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold tabular-nums ${met ? 'text-[#008B3D]' : pts > 0 ? 'text-[#632E84]' : 'text-gray-400'}`}>{pts}pts</span>
                        <span className="text-sm text-gray-400"> / {goalPts}pts</span>
                        <span className="text-xs text-gray-400 ml-2">({count}/{a.monthlyGoalCount})</span>
                      </div>
                    </div>
                    <ProgressBar value={pts} max={goalPts} color="purple" />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Compensation Report ──────────────────────────────────────────────────────

function DealTable({ deals, emptyMsg }) {
  if (deals.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">{emptyMsg}</p>;
  }
  const totRevenue = deals.reduce((s, d) => s + (d.total_revenue || 0), 0);
  const totHIG = deals.reduce((s, d) => s + (d.hig_revenue || 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {['Name', 'Stage', 'Total Revenue', 'HIG Revenue', 'Referral Split', 'Date'].map(h => (
              <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map(d => {
            const dateVal = (d.sale_paid_date || d.created_at)?.substring(0, 10);
            return (
              <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-4 py-2.5 font-medium text-gray-900">{d.name}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DEAL_STAGE_COLORS[d.sales_stage] || 'bg-gray-100 text-gray-500'}`}>
                    {d.sales_stage}
                  </span>
                </td>
                <td className="px-4 py-2.5 tabular-nums font-medium text-gray-800">{formatCurrency(d.total_revenue)}</td>
                <td className="px-4 py-2.5 tabular-nums font-semibold text-[#008B3D]">{formatCurrency(d.hig_revenue)}</td>
                <td className="px-4 py-2.5 text-gray-500">{d.referral_split || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(dateVal)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td colSpan={2} className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Total</td>
            <td className="px-4 py-2.5 font-bold tabular-nums text-gray-900">{formatCurrency(totRevenue)}</td>
            <td className="px-4 py-2.5 font-bold tabular-nums text-[#008B3D]">{formatCurrency(totHIG)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const CompensationReport = ({ toast }) => {
  const [view, setView] = useState('weekly');
  const [weekStart, setWeekStart] = useState(() => getSunday(new Date()));
  const [my, setMy] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() + 1 }; });
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDeals()
      .then(setDeals)
      .catch(() => toast?.('Failed to load deals', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const allHIG = deals.reduce((s, d) => s + (d.hig_revenue || 0), 0);
  const higPct = Math.min(100, Math.round((allHIG / ANNUAL_HIG_GOAL) * 100));
  const higGoalMet = allHIG >= ANNUAL_HIG_GOAL;

  const activeDeals = deals.filter(d => !d.is_paid);
  const paidDeals = deals.filter(d => d.is_paid);

  const dealDate = (d) => (d.sale_paid_date || d.created_at)?.substring(0, 10);

  const paidInPeriod = view === 'weekly'
    ? paidDeals.filter(d => isDateInWeek(dealDate(d), weekStart))
    : paidDeals.filter(d => isDateInMonth(dealDate(d), my.year, my.month));

  const periodLabel = view === 'weekly' ? formatWeekRange(weekStart) : formatMonthName(my);

  const activeRevenue = activeDeals.reduce((s, d) => s + (d.total_revenue || 0), 0);
  const activeHIG = activeDeals.reduce((s, d) => s + (d.hig_revenue || 0), 0);
  const paidRevenue = paidDeals.reduce((s, d) => s + (d.total_revenue || 0), 0);
  const paidHIG = paidDeals.reduce((s, d) => s + (d.hig_revenue || 0), 0);

  const periodRevenue = paidInPeriod.reduce((s, d) => s + (d.total_revenue || 0), 0);
  const periodHIG = paidInPeriod.reduce((s, d) => s + (d.hig_revenue || 0), 0);

  // For monthly: group paid deals by week
  const weeksInMonth = view === 'monthly' ? getWeeksInMonth(my.year, my.month) : [];
  const paidByWeek = weeksInMonth
    .map(ws => ({ weekStart: ws, deals: paidDeals.filter(d => isDateInWeek(dealDate(d), ws)) }))
    .filter(({ deals: wds }) => wds.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <ViewToggle view={view} onChange={setView} />
        <div className="flex items-center gap-3 flex-wrap">
          {view === 'weekly'
            ? <WeekNav weekStart={weekStart} onChange={setWeekStart} />
            : <MonthNav my={my} onChange={setMy} />}
          <button
            onClick={() => exportCompensationPDF(view, { weekStart, my, deals, allHIG, higPct, weeksInMonth })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Annual HIG goal */}
          <div className={`card ${higGoalMet ? 'border-green-200 bg-green-50/40' : ''}`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {higGoalMet ? <CheckCircle className="w-5 h-5 text-[#008B3D]" /> : <TrendingUp className="w-5 h-5 text-gray-400" />}
                <span className="font-semibold text-gray-900">Annual HIG Revenue Goal</span>
                {higGoalMet && <span className="text-xs font-semibold text-[#008B3D] bg-green-100 px-2 py-0.5 rounded-full">Goal Achieved!</span>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold tabular-nums ${higGoalMet ? 'text-[#008B3D]' : 'text-gray-900'}`}>{formatCurrency(allHIG)}</span>
                <span className="text-base text-gray-400">/ {formatCurrency(ANNUAL_HIG_GOAL)}</span>
              </div>
            </div>
            <ProgressBar value={allHIG} max={ANNUAL_HIG_GOAL} size="md" />
            <p className="text-xs text-gray-400 mt-1.5">
              {higPct}% of annual goal
              {!higGoalMet && ` — ${formatCurrency(ANNUAL_HIG_GOAL - allHIG)} remaining`}
            </p>
          </div>

          {/* Pipeline vs Paid summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Active Pipeline</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {activeDeals.length} <span className="text-base font-medium text-gray-400">deals</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatCurrency(activeRevenue)} total · <span className="font-semibold text-[#008B3D]">{formatCurrency(activeHIG)} HIG</span>
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Paid / Closed (All Time)</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {paidDeals.length} <span className="text-base font-medium text-gray-400">deals</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatCurrency(paidRevenue)} total · <span className="font-semibold text-[#008B3D]">{formatCurrency(paidHIG)} HIG</span>
              </p>
            </div>
          </div>

          {/* Active pipeline table */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Active Pipeline</h3>
              <span className="text-xs text-gray-400">{activeDeals.length} deals</span>
            </div>
            <div className="p-4">
              <DealTable deals={activeDeals} emptyMsg="No active deals" />
            </div>
          </div>

          {/* Paid deals for period */}
          {view === 'weekly' ? (
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Paid Deals — {periodLabel}</h3>
                <div className="flex items-center gap-3">
                  {paidInPeriod.length > 0 && (
                    <span className="text-xs font-semibold text-[#008B3D]">{formatCurrency(periodHIG)} HIG</span>
                  )}
                  <span className="text-xs text-gray-400">{paidInPeriod.length} deals</span>
                </div>
              </div>
              <div className="p-4">
                <DealTable deals={paidInPeriod} emptyMsg="No paid deals this week" />
              </div>
            </div>
          ) : (
            <>
              {paidByWeek.length === 0 ? (
                <div className="card text-center py-8 text-gray-400">
                  No paid deals in {formatMonthName(my)}
                </div>
              ) : (
                paidByWeek.map(({ weekStart: ws, deals: wDeals }) => (
                  <div key={ws} className="card p-0 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Paid Deals — {formatWeekRange(ws)}</h3>
                      <span className="text-xs font-semibold text-[#008B3D]">
                        {formatCurrency(wDeals.reduce((s, d) => s + (d.hig_revenue || 0), 0))} HIG
                      </span>
                    </div>
                    <div className="p-4">
                      <DealTable deals={wDeals} emptyMsg="" />
                    </div>
                  </div>
                ))
              )}

              {/* Monthly revenue summary */}
              {paidInPeriod.length > 0 && (
                <div className="card">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Monthly Revenue Summary — {formatMonthName(my)}</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Total Revenue</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums mt-1">{formatCurrency(periodRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">HIG Revenue</p>
                      <p className="text-xl font-bold text-[#008B3D] tabular-nums mt-1">{formatCurrency(periodHIG)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Deals Closed</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums mt-1">{paidInPeriod.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

// ─── Opportunities Report (restored ReportBuilder) ───────────────────────────

const OPP_PROCESSES = ['Prospect','QP','Appt.','Case Open','Closing','UW','Sale Made','Inactive','Not Interested','Open','Due Diligence','Allocation'];
const OPP_TYPES = ['DVA','PPLI','Life','Annuity','P&C','Institutional'];

const OpportunitiesReport = ({ toast }) => {
  const [filters, setFilters] = useState({ opp_process: 'all', client_type: '', opp_type: '', relationship: '', priority: '', date_from: '', date_to: '', sort: 'name_asc' });
  const [data, setData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const runReport = async () => {
    setLoading(true);
    try {
      const rows = await getReport(filters);
      setData(rows);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = data.reduce((s, r) => s + (r.potential_revenue || 0), 0);
  const totalAUM = data.reduce((s, r) => s + (r.aum || 0), 0);
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && v !== 'all' && k !== 'sort'));

  return (
    <div className="space-y-6">
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
            <Search className="w-4 h-4" />
            {loading ? 'Running...' : 'Run Report'}
          </button>
        </div>
      </div>

      {loaded && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm"><span className="font-semibold text-gray-900">{data.length}</span> records found</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { exportToExcel(data, activeFilters); toast('Exported to Excel', 'success'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </button>
              <button
                onClick={() => { exportToPDF(data, activeFilters); toast('Exported to PDF', 'success'); }}
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

// ─── Main Reports component ───────────────────────────────────────────────────

export const Reports = ({ toast }) => {
  const [report, setReport] = useState('activity');

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Performance analytics and compensation insights</p>
      </div>

      <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit max-w-full overflow-x-auto">
        {[
          { key: 'activity',       label: 'Activity',       Icon: BarChart2  },
          { key: 'compensation',   label: 'Compensation',   Icon: TrendingUp },
          { key: 'opportunities',  label: 'Opportunities',  Icon: Users      },
        ].map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setReport(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              report === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {report === 'activity' && <ActivityReport toast={toast} />}
      {report === 'compensation' && <CompensationReport toast={toast} />}
      {report === 'opportunities' && <OpportunitiesReport toast={toast} />}
    </div>
  );
};
