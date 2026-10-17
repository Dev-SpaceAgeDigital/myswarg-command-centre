'use client';
import { useState } from 'react';
import { Copy, Check, KeyRound } from 'lucide-react';

export interface ActivationInfo { code: string; expiresAt: string }
export interface CodeEntry { name: string; phone: string; activation: ActivationInfo | null }

function daysLeft(expiresAt: string) {
  return Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

function messageFor(e: CodeEntry) {
  return (
    `Hi ${e.name}, welcome to MySwarg!\n\n` +
    `Your one-time activation code: ${e.activation?.code}\n` +
    `Mobile number: ${e.phone}\n\n` +
    `Open the MySwarg app, enter your mobile number, then this code, and choose a 6-digit PIN. ` +
    `The code works once and expires in ${e.activation ? daysLeft(e.activation.expiresAt) : 7} days.`
  );
}

/** Shows one-time activation codes. They are stored hashed, so this is the only time they can be read. */
export default function ActivationCodeModal({
  title = 'Share activation code', entries, onClose,
}: { title?: string; entries: CodeEntry[]; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const issued = entries.filter((e) => e.activation);

  const copy = async (e: CodeEntry) => {
    try {
      await navigator.clipboard.writeText(messageFor(e));
      setCopied(e.phone);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* clipboard blocked: the code is still visible on screen */ }
  };

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={18} className="text-blue-600" />
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Each code works once and is shown only now. Copy the message and send it to the person before closing.
        </p>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {issued.map((e) => (
            <div key={e.phone} className="rounded-xl bg-gray-50 ring-1 ring-inset ring-gray-200/70 p-4 text-center">
              <p className="text-sm font-medium text-gray-700">{e.name} · {e.phone}</p>
              <p className="text-3xl font-bold tracking-[0.25em] text-blue-700 my-2 select-all">{e.activation!.code}</p>
              <p className="text-xs text-gray-400 mb-3">Valid for {daysLeft(e.activation!.expiresAt)} days</p>
              <button
                onClick={() => copy(e)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                {copied === e.phone ? <Check size={14} /> : <Copy size={14} />}
                {copied === e.phone ? 'Copied' : 'Copy message'}
              </button>
            </div>
          ))}
          {entries.filter((e) => !e.activation).map((e) => (
            <div key={`s-${e.phone}`} className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">
              {e.name} · {e.phone} is already set up. No new code needed.
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 w-full h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Done
        </button>
      </div>
    </div>
  );
}
