'use client';

import { useState } from 'react';

interface Props {
  data?: Record<string, any> | null;
  label: string;
}

export default function JsonCell({ data, label }: Props) {
  const [open, setOpen] = useState(false);

  if (!data || Object.keys(data).length === 0)
    return <span className="text-gray-300">-</span>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium underline underline-offset-2"
      >
        View
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-800">{label}</h4>
            </div>
            <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-700 overflow-auto max-h-80 whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full border border-gray-300 text-gray-600 py-2 rounded text-sm hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}