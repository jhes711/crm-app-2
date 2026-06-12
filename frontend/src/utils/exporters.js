import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getName, formatCurrency, formatDate } from './formatters';

const buildRows = (data) => data.map(row => ({
  'Type': row.client_type,
  'Name': getName(row),
  'Referred By': row.referred_by || '—',
  'Relationship': row.relationship || '—',
  'Opp. Process': row.opp_process || '—',
  'Opp. Type': row.opp_type || '—',
  'Potential Revenue': row.potential_revenue || 0,
  'AUM': row.aum || 0,
  'Last Contact': row.last_contact || '—',
  'Priority': row.priority || '—',
  'Next Follow-Up': row.next_followup || '—'
}));

export const exportToExcel = (data, filters) => {
  const rows = buildRows(data);
  const totalsRow = {
    'Type': '', 'Name': 'TOTALS', 'Referred By': '', 'Relationship': '',
    'Opp. Process': '', 'Opp. Type': '',
    'Potential Revenue': data.reduce((s, r) => s + (r.potential_revenue || 0), 0),
    'AUM': data.reduce((s, r) => s + (r.aum || 0), 0),
    'Last Contact': '', 'Priority': '', 'Next Follow-Up': ''
  };
  rows.push(totalsRow);

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [8,22,18,14,14,12,18,18,14,10,14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CRM Report');
  XLSX.writeFile(wb, `CRM_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToPDF = (data, filters) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('CRM Sales Report', 40, 40);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`, 40, 58);

  const filterSummary = Object.entries(filters).filter(([,v]) => v && v !== 'all').map(([k,v]) => `${k}: ${v}`).join('  |  ');
  if (filterSummary) doc.text(`Filters: ${filterSummary}`, 40, 72);

  const head = [['Type','Name','Referred By','Relationship','Opp. Process','Opp. Type','Revenue','AUM','Last Contact','Priority','Next Follow-Up']];
  const body = data.map(row => [
    row.client_type,
    getName(row),
    row.referred_by || '—',
    row.relationship || '—',
    row.opp_process || '—',
    row.opp_type || '—',
    formatCurrency(row.potential_revenue),
    formatCurrency(row.aum),
    formatDate(row.last_contact),
    row.priority || '—',
    formatDate(row.next_followup)
  ]);

  const totalRevenue = data.reduce((s, r) => s + (r.potential_revenue || 0), 0);
  const totalAUM = data.reduce((s, r) => s + (r.aum || 0), 0);
  body.push(['', 'TOTALS', '', '', '', '', formatCurrency(totalRevenue), formatCurrency(totalAUM), '', '', '']);

  autoTable(doc, {
    head,
    body,
    startY: filterSummary ? 85 : 70,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    foot: [],
    didParseCell: (data) => {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
      }
    }
  });

  doc.save(`CRM_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
