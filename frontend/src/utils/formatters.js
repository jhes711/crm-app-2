export const formatCurrency = (val) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
};

export const formatDate = (val) => {
  if (!val) return '—';
  const [y, m, d] = val.split('-');
  return `${m}/${d}/${y}`;
};

export const getName = (row) => {
  if (row.client_type === 'Individual') {
    return [row.first_name, row.middle_initial ? row.middle_initial + '.' : null, row.last_name].filter(Boolean).join(' ');
  }
  return row.institution_name || '—';
};

export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr) <= new Date(new Date().toDateString());
};

export const isToday = (dateStr) => {
  if (!dateStr) return false;
  return dateStr === new Date().toISOString().split('T')[0];
};

export const PRIORITY_COLORS = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200'
};

export const STAGE_COLORS = {
  'Prospect': 'bg-blue-100 text-blue-700',
  'QP': 'bg-purple-100 text-purple-700',
  'Appt.': 'bg-indigo-100 text-indigo-700',
  'Case Open': 'bg-orange-100 text-orange-700',
  'Closing': 'bg-amber-100 text-amber-700',
  'UW': 'bg-cyan-100 text-cyan-700',
  'Sale Made': 'bg-green-100 text-green-700',
  'Inactive': 'bg-gray-100 text-gray-500',
  'Not Interested': 'bg-red-100 text-red-600',
  'Open': 'bg-sky-100 text-sky-700',
  'Due Diligence': 'bg-violet-100 text-violet-700',
  'Allocation': 'bg-emerald-100 text-emerald-700'
};
