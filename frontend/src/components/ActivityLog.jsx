import React, { useEffect, useState } from 'react';
import { getActivityFeed } from '../utils/api';
import { Activity, Clock } from 'lucide-react';

const ACTION_COLORS = {
  Created: 'bg-green-100 text-green-700',
  Updated: 'bg-blue-100 text-blue-700',
  Deleted: 'bg-red-100 text-red-700'
};

const formatFieldName = (name) => {
  if (!name) return '';
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export const ActivityLogPage = () => {
  const [log, setLog] = useState([]);

  useEffect(() => { getActivityFeed().then(setLog); }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-500 text-sm mt-1">Full audit trail of all changes (last 100 entries)</p>
      </div>

      <div className="card p-0">
        {log.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No activity logged yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {log.map(entry => (
              <div key={entry.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-600'}`}>
                  {entry.action}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{entry.opp_name}</span>
                    <span className="text-gray-400 text-xs">({entry.client_type})</span>
                  </div>
                  {entry.field_name && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      <span className="font-medium">{formatFieldName(entry.field_name)}</span>
                      {entry.old_value ? (
                        <> changed from <span className="text-gray-800">"{entry.old_value}"</span> to <span className="text-gray-800">"{entry.new_value}"</span></>
                      ) : (
                        <> set to <span className="text-gray-800">"{entry.new_value}"</span></>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {entry.changed_at?.replace('T', ' ').substring(0, 16)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
