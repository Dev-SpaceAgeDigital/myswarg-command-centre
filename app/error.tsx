'use client';
import { AlertCircle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-96 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 bg-red-50 ring-1 ring-inset ring-red-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-2">Oops, something went wrong 😅</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-sm">{error.message}</p>
      <button
        onClick={reset}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
