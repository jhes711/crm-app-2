import React from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  info: <AlertCircle className="w-5 h-5 text-blue-500" />
};

export const ToastContainer = ({ toasts, dismiss }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
    {toasts.map(t => (
      <div key={t.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-64 animate-slide-in">
        {icons[t.type] || icons.success}
        <span className="text-sm text-gray-700 flex-1">{t.message}</span>
        <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    ))}
  </div>
);
