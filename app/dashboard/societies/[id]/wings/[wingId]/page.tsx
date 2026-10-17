'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Home, Users, UserCheck, Plus, X, Phone } from 'lucide-react';
import api from '@/lib/api';
import ActivationCodeModal, { CodeEntry } from '@/components/ActivationCodeModal';

interface FlatUser {
  id: string;
  name: string;
  phone: string;
  residentType: string;
  role: string;
}

interface Flat {
  id: string;
  number: string;
  floor: number;
  familyMembers: number;
  users: FlatUser[];
}

interface Secretary {
  id: string;
  name: string;
  phone: string;
  isPrimary: boolean;
  pin?: { status: 'ACTIVE' | 'CODE_PENDING' | 'CODE_EXPIRED' | 'NOT_ACTIVATED' };
}

interface WingData {
  id: string;
  name: string;
  society: { id: string; name: string };
  flats: Flat[];
  users: Secretary[];
  stats: { totalFlats: number; occupiedFlats: number; vacantFlats: number; totalResidents: number };
}

// ─── Set Secretary Modal ──────────────────────────────────────────────────────

function SetSecretaryModal({
  wingId, replaceUser, onClose, onSuccess,
}: { wingId: string; replaceUser?: Secretary; onClose: () => void; onSuccess: (codes: CodeEntry[]) => void }) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name || !form.phone) { setError('Name and phone are required'); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, string> = { name: form.name, phone: form.phone };
      if (replaceUser) payload.replaceUserId = replaceUser.id;
      const res = await api.post(`/superadmin/wings/${wingId}/secretary`, payload);
      const activation = res.data?.data?.activation ?? null;
      onSuccess([{ name: form.name, phone: form.phone, activation }]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set secretary');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            {replaceUser ? 'Replace Secretary' : 'Add Secretary'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        {replaceUser && (
          <div className="mb-4 p-3 bg-orange-50 rounded-xl text-sm text-orange-700">
            Replacing: <span className="font-medium">{replaceUser.name}</span> ({replaceUser.phone})
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Secretary name"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Phone *</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="10-digit mobile number"
              maxLength={10}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 bg-white shadow-xs rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {submitting ? 'Saving...' : replaceUser ? 'Replace' : 'Add Secretary'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const societyId = params.id as string;
  const wingId = params.wingId as string;

  const [wing, setWing] = useState<WingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecretary, setShowSecretary] = useState(false);
  const [issued, setIssued] = useState<CodeEntry[] | null>(null);

  const resetPin = async (sec: Secretary) => {
    if (!confirm(`Reset PIN for ${sec.name}? They will be signed out everywhere and need the new activation code.`)) return;
    try {
      const res = await api.post(`/superadmin/users/${sec.id}/reset-pin`);
      const d = res.data.data;
      setIssued([{ name: d.name, phone: d.phone, activation: d.activation }]);
      fetchWing();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not reset the PIN');
    }
  };
  const [replaceTarget, setReplaceTarget] = useState<Secretary | undefined>(undefined);

  const fetchWing = useCallback(async () => {
    try {
      const res = await api.get(`/superadmin/wings/${wingId}`);
      setWing(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [wingId]);

  useEffect(() => { fetchWing(); }, [fetchWing]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!wing) return null;

  const { stats } = wing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/dashboard/societies/${societyId}`)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> {wing.society.name}
        </button>
        <h1 className="text-2xl font-semibold tracking-tight tabular-nums text-gray-900">{wing.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{wing.society.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Flats', value: stats.totalFlats },
          { label: 'Occupied',    value: stats.occupiedFlats },
          { label: 'Vacant',      value: stats.vacantFlats },
          { label: 'Residents',   value: stats.totalResidents },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Secretary section */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Secretary ({wing.users.length}/2)
          </h2>
          {wing.users.length < 2 && (
            <button
              onClick={() => { setReplaceTarget(undefined); setShowSecretary(true); }}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={14} /> Add Secretary
            </button>
          )}
        </div>

        {wing.users.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <UserCheck size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No secretary assigned</p>
            <button
              onClick={() => { setReplaceTarget(undefined); setShowSecretary(true); }}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Add secretary
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {wing.users.map(sec => (
              <div key={sec.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 text-sm font-bold">{sec.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{sec.name}</p>
                      {sec.isPrimary && (
                        <span className="text-xs bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/15 font-medium px-1.5 py-0.5 rounded-full">Primary</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {sec.phone}
                      {sec.pin && (
                        <span className={sec.pin.status === 'ACTIVE' ? 'text-emerald-600' : 'text-orange-500'}>
                          {' · '}
                          {sec.pin.status === 'ACTIVE' ? 'PIN set'
                            : sec.pin.status === 'CODE_PENDING' ? 'Waiting for activation'
                            : sec.pin.status === 'CODE_EXPIRED' ? 'Code expired' : 'Not activated'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${sec.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    title={`Call ${sec.name}`}
                  >
                    <Phone size={14} className="text-emerald-600" />
                  </a>
                  <button
                    onClick={() => resetPin(sec)}
                    className="text-xs text-gray-400 hover:text-blue-600 font-medium px-3 py-1.5 border border-gray-200 rounded-lg hover:border-blue-200 transition-colors"
                  >
                    Reset PIN
                  </button>
                  <button
                    onClick={() => { setReplaceTarget(sec); setShowSecretary(true); }}
                    className="text-xs text-gray-400 hover:text-orange-500 font-medium px-3 py-1.5 border border-gray-200 rounded-lg hover:border-orange-200 transition-colors"
                  >
                    Replace
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flats list */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Flats ({wing.flats.length})</h2>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full" /> Occupied ({stats.occupiedFlats})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-gray-300 rounded-full" /> Vacant ({stats.vacantFlats})
            </span>
          </div>
        </div>

        {wing.flats.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Home size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No flats generated yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {wing.flats.map(flat => {
              const residents = flat.users.filter(u => u.role === 'RESIDENT');
              const occupied = flat.users.length > 0;
              return (
                <div key={flat.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      occupied ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15' : 'bg-gray-50 text-gray-400'
                    }`}>
                      {flat.number}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {residents.length > 0 ? residents.map(r => r.name).join(', ') : 'Vacant'}
                      </p>
                      <p className="text-xs text-gray-400">Floor {flat.floor}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    occupied ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {occupied ? 'Occupied' : 'Vacant'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {issued && <ActivationCodeModal title="Share activation code" entries={issued} onClose={() => setIssued(null)} />}

      {showSecretary && (
        <SetSecretaryModal
          wingId={wingId}
          replaceUser={replaceTarget}
          onClose={() => { setShowSecretary(false); setReplaceTarget(undefined); }}
          onSuccess={(c) => { fetchWing(); setShowSecretary(false); setReplaceTarget(undefined); setIssued(c); }}
        />
      )}
    </div>
  );
}
