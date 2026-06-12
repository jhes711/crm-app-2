import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Trash2 } from 'lucide-react';
import { createOpportunity, updateOpportunity, getStageHistory, deleteOpportunity } from '../utils/api';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { formatDate, STAGE_COLORS } from '../utils/formatters';

const RELATIONSHIPS = ['Tom','Jerry'];
const PRIORITIES = ['High','Medium','Low'];

const OPP_PROCESS = {
  Individual: ['Prospect','QP','Appt.','Case Open','Closing','UW','Sale Made','Inactive','Not Interested'],
  Institution: ['Prospect','QP','Appt.','Case Open','Closing','UW','Sale Made','Inactive','Not Interested'],
  Platform: ['Prospect','QP','Appt.','Open','Closing','Due Diligence','Allocation','Inactive','Not Interested']
};

const OPP_TYPES = {
  Individual: ['DVA','PPLI','Life','Annuity','P&C'],
  Institution: ['DVA','PPLI','BOLI','ICOLI','Life','P&C'],
  Platform: ['DVA','PPLI','Institutional']
};

const EMPTY = {
  client_type: 'Individual', last_name: '', middle_initial: '', first_name: '',
  institution_name: '', referred_by: '', relationship: 'Jerry',
  opp_process: 'Prospect', opp_type: 'DVA',
  potential_revenue: '', aum: '', last_contact: '', notes: '',
  priority: 'Medium', next_followup: '',
  contact1_first_name: '', contact1_last_name: '',
  contact2_first_name: '', contact2_last_name: '',
};

const Field = ({ label, required, children }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
  </div>
);

export const OpportunityForm = ({ record, onClose, onSaved, toast }) => {
  const [form, setForm] = useState(record ? {
    ...record,
    contact1_first_name: record.contact1_first_name || '',
    contact1_last_name:  record.contact1_last_name  || '',
    contact2_first_name: record.contact2_first_name || '',
    contact2_last_name:  record.contact2_last_name  || '',
  } : { ...EMPTY });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('form');

  useEffect(() => {
    if (record?.id) {
      getStageHistory(record.id).then(setHistory);
    }
  }, [record?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.client_type) e.client_type = true;
    if (form.client_type === 'Individual') {
      if (!form.last_name?.trim()) e.last_name = true;
      if (!form.first_name?.trim()) e.first_name = true;
    } else {
      if (!form.institution_name?.trim()) e.institution_name = true;
    }
    if (!form.opp_process) e.opp_process = true;
    if (!form.opp_type) e.opp_type = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        potential_revenue: parseFloat(String(form.potential_revenue).replace(/[^0-9.]/g, '')) || 0,
        aum: parseFloat(String(form.aum).replace(/[^0-9.]/g, '')) || 0
      };
      const saved = record?.id
        ? await updateOpportunity(record.id, payload)
        : await createOpportunity(payload);
      toast(record?.id ? 'Record updated successfully' : 'Record created successfully', 'success');
      onSaved(saved);
    } catch (err) {
      toast('Error saving record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteOpportunity(record.id);
      toast('Record deleted successfully', 'success');
      onSaved();
    } catch (err) {
      toast('Error deleting record', 'error');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const deleteLabel = form.client_type === 'Individual'
    ? `${form.first_name} ${form.last_name}`.trim()
    : form.institution_name;

  const isInst = form.client_type !== 'Individual';
  const err = (k) => errors[k] ? 'border-red-400 ring-1 ring-red-400' : '';

  return (
    <>
    <ConfirmDialog
      open={showConfirm}
      message={`Are you sure you want to delete "${deleteLabel}"? This cannot be undone.`}
      onConfirm={handleDelete}
      onCancel={() => setShowConfirm(false)}
    />
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white h-full w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-navy-900">
          <div>
            <h2 className="text-lg font-semibold text-white">{record?.id ? 'Edit Opportunity' : 'New Opportunity'}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{record?.id ? 'Update record details' : 'Add a new sales opportunity'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs (only for existing records) */}
        {record?.id && (
          <div className="flex border-b border-gray-100 px-6">
            {['form','history'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${tab===t ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t === 'form' ? 'Details' : 'Stage History'}
              </button>
            ))}
          </div>
        )}

        {tab === 'history' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Stage History</h3>
            {history.length === 0 ? <p className="text-gray-500 text-sm">No history available.</p> : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {h.from_stage && <span className={`px-2 py-0.5 rounded-full text-xs ${STAGE_COLORS[h.from_stage]}`}>{h.from_stage}</span>}
                        {h.from_stage && <span className="text-gray-400 text-xs">→</span>}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[h.to_stage]}`}>{h.to_stage}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{h.changed_at?.replace('T',' ').substring(0,16)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Client Type */}
              <Field label="Client Type" required>
                <div className="flex gap-2">
                  {['Individual','Institution','Platform'].map(ct => (
                    <button key={ct} onClick={() => { set('client_type', ct); set('opp_process', OPP_PROCESS[ct][0]); set('opp_type', OPP_TYPES[ct][0]); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.client_type === ct ? 'bg-navy-900 text-white border-navy-900' : 'border-gray-200 text-gray-600 hover:border-teal-400'}`}>
                      {ct}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Name fields */}
              {form.client_type === 'Individual' ? (
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-5">
                    <Field label="Last Name" required>
                      <input className={`input ${err('last_name')}`} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="M.I.">
                      <input className="input" maxLength={1} value={form.middle_initial} onChange={e => set('middle_initial', e.target.value)} placeholder="M" />
                    </Field>
                  </div>
                  <div className="col-span-5">
                    <Field label="First Name" required>
                      <input className={`input ${err('first_name')}`} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
                    </Field>
                  </div>
                </div>
              ) : (
                <Field label="Institution Name" required>
                  <input className={`input ${err('institution_name')}`} value={form.institution_name} onChange={e => set('institution_name', e.target.value)} placeholder="Institution name" />
                </Field>
              )}

              {/* Contacts — Institution only */}
              {form.client_type === 'Institution' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Contact 1 — First Name">
                      <input className="input" value={form.contact1_first_name} onChange={e => set('contact1_first_name', e.target.value)} placeholder="First name" />
                    </Field>
                    <Field label="Contact 1 — Last Name">
                      <input className="input" value={form.contact1_last_name} onChange={e => set('contact1_last_name', e.target.value)} placeholder="Last name" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Contact 2 — First Name">
                      <input className="input" value={form.contact2_first_name} onChange={e => set('contact2_first_name', e.target.value)} placeholder="First name" />
                    </Field>
                    <Field label="Contact 2 — Last Name">
                      <input className="input" value={form.contact2_last_name} onChange={e => set('contact2_last_name', e.target.value)} placeholder="Last name" />
                    </Field>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Referred By">
                  <input className="input" value={form.referred_by} onChange={e => set('referred_by', e.target.value)} placeholder="Referral source" />
                </Field>
                <Field label="Relationship" required>
                  <select className="select" value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                    {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Opp. Process" required>
                  <select className={`select ${err('opp_process')}`} value={form.opp_process} onChange={e => set('opp_process', e.target.value)}>
                    {OPP_PROCESS[form.client_type]?.map(p => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Opp. Type" required>
                  <select className={`select ${err('opp_type')}`} value={form.opp_type} onChange={e => set('opp_type', e.target.value)}>
                    {OPP_TYPES[form.client_type]?.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Potential Revenue">
                  <input className="input" value={form.potential_revenue} onChange={e => set('potential_revenue', e.target.value)} placeholder="$0" />
                </Field>
                <Field label="AUM">
                  <input className="input" value={form.aum} onChange={e => set('aum', e.target.value)} placeholder="$0" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Last Contact">
                  <input type="date" className="input" value={form.last_contact} onChange={e => set('last_contact', e.target.value)} />
                </Field>
                <Field label="Priority">
                  <select className="select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Next Follow-Up Date">
                <input type="date" className="input" value={form.next_followup} onChange={e => set('next_followup', e.target.value)} />
              </Field>

              <Field label="Notes">
                <textarea className="input min-h-24 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Free-form notes..." />
              </Field>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              {record?.id ? (
                <button onClick={() => setShowConfirm(true)} disabled={deleting} className="btn-danger flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : <div />}
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary min-w-24">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};
