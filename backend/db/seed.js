const db = require('./database');

const existing = db.prepare('SELECT COUNT(*) as count FROM opportunities').get();
if (existing.count > 0) {
  console.log('Database already seeded.');
} else {
  const insert = db.prepare(`
    INSERT INTO opportunities (client_type, last_name, middle_initial, first_name, institution_name, referred_by, relationship, opp_process, opp_type, potential_revenue, aum, last_contact, notes, priority, next_followup)
    VALUES (@client_type, @last_name, @middle_initial, @first_name, @institution_name, @referred_by, @relationship, @opp_process, @opp_type, @potential_revenue, @aum, @last_contact, @notes, @priority, @next_followup)
  `);
  const insertStage = db.prepare('INSERT INTO stage_history (opportunity_id, from_stage, to_stage, changed_at) VALUES (@opportunity_id, @from_stage, @to_stage, @changed_at)');
  const insertActivity = db.prepare('INSERT INTO activity_log (opportunity_id, action, field_name, old_value, new_value, changed_at) VALUES (@opportunity_id, @action, @field_name, @old_value, @new_value, @changed_at)');

  const seeds = [
    { client_type: 'Individual', last_name: 'Johnson', middle_initial: 'R', first_name: 'Michael', institution_name: null, referred_by: 'Robert Smith', relationship: 'Jerry', opp_process: 'QP', opp_type: 'PPLI', potential_revenue: 125000, aum: 4500000, last_contact: '2026-05-10', notes: 'High-net-worth client. Interested in PPLI structure for estate planning. Met at charity gala.', priority: 'High', next_followup: '2026-05-28' },
    { client_type: 'Individual', last_name: 'Williams', middle_initial: 'A', first_name: 'Sarah', institution_name: null, referred_by: 'David Lee', relationship: 'Tom', opp_process: 'Appt.', opp_type: 'DVA', potential_revenue: 45000, aum: 1200000, last_contact: '2026-05-18', notes: 'Looking for tax-deferred growth solutions. Appointment set for next week.', priority: 'Medium', next_followup: '2026-05-26' },
    { client_type: 'Individual', last_name: 'Martinez', middle_initial: 'E', first_name: 'Carlos', institution_name: null, referred_by: 'Internal', relationship: 'Jonathan', opp_process: 'Case Open', opp_type: 'Life', potential_revenue: 80000, aum: 2800000, last_contact: '2026-05-15', notes: 'Business owner. Key-man life insurance case opened. Financials received.', priority: 'High', next_followup: '2026-05-30' },
    { client_type: 'Individual', last_name: 'Thompson', middle_initial: 'B', first_name: 'Linda', institution_name: null, referred_by: 'James Thompson', relationship: 'Jay', opp_process: 'Prospect', opp_type: 'Annuity', potential_revenue: 22000, aum: 750000, last_contact: '2026-05-05', notes: 'Referred by spouse. Interested in fixed annuity for retirement income.', priority: 'Low', next_followup: '2026-06-10' },
    { client_type: 'Individual', last_name: 'Anderson', middle_initial: 'K', first_name: 'Patricia', institution_name: null, referred_by: 'Richard Cole', relationship: 'Andy', opp_process: 'Sale Made', opp_type: 'PPLI', potential_revenue: 200000, aum: 8000000, last_contact: '2026-05-20', notes: 'Policy issued. Premium received. Excellent relationship — ask for referrals.', priority: 'High', next_followup: '2026-08-01' },
    { client_type: 'Institution', last_name: null, middle_initial: null, first_name: null, institution_name: 'Meridian Family Office', referred_by: 'Susan Grant', relationship: 'Jerry', opp_process: 'QP', opp_type: 'DVA', potential_revenue: 350000, aum: 95000000, last_contact: '2026-05-12', notes: 'Multi-family office managing 14 families. Evaluating DVA solutions for HNW clients.', priority: 'High', next_followup: '2026-05-27' },
    { client_type: 'Institution', last_name: null, middle_initial: null, first_name: null, institution_name: 'Clearwater Wealth Advisors', referred_by: 'Conference Contact', relationship: 'Tom', opp_process: 'Appt.', opp_type: 'PPLI', potential_revenue: 180000, aum: 42000000, last_contact: '2026-05-19', notes: 'RIA firm with 230 clients. Met at FPA conference. Demo scheduled.', priority: 'Medium', next_followup: '2026-05-29' },
    { client_type: 'Institution', last_name: null, middle_initial: null, first_name: null, institution_name: 'Pinnacle Trust Company', referred_by: 'Internal', relationship: 'Jonathan', opp_process: 'Closing', opp_type: 'Life', potential_revenue: 500000, aum: 210000000, last_contact: '2026-05-22', notes: 'Trust company with institutional life insurance needs. Final proposal delivered. Decision expected this week.', priority: 'High', next_followup: '2026-05-24' },
    { client_type: 'Platform', last_name: null, middle_initial: null, first_name: null, institution_name: 'Apex Distribution Partners', referred_by: 'Industry Contact', relationship: 'Jerry', opp_process: 'Due Diligence', opp_type: 'DVA', potential_revenue: 750000, aum: 500000000, last_contact: '2026-05-14', notes: 'National distribution platform. In due diligence phase for DVA product listing. Compliance review underway.', priority: 'High', next_followup: '2026-06-01' },
    { client_type: 'Platform', last_name: null, middle_initial: null, first_name: null, institution_name: 'BlueStar Insurance Platform', referred_by: 'Tom Referral', relationship: 'Tom', opp_process: 'Allocation', opp_type: 'PPLI', potential_revenue: 420000, aum: 280000000, last_contact: '2026-05-21', notes: 'Allocation agreement signed. First tranche of $50M expected Q3 2026.', priority: 'Medium', next_followup: '2026-06-15' }
  ];

  const seedMany = db.transaction((records) => {
    for (const rec of records) {
      const result = insert.run(rec);
      const id = result.lastInsertRowid;
      insertStage.run({ opportunity_id: id, from_stage: null, to_stage: rec.opp_process, changed_at: rec.last_contact });
      insertActivity.run({ opportunity_id: id, action: 'Created', field_name: null, old_value: null, new_value: null, changed_at: rec.last_contact });
    }
  });

  seedMany(seeds);
  console.log(`Seeded ${seeds.length} opportunities.`);
}
