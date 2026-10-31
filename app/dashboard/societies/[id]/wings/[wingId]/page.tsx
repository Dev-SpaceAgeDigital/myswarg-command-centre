'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Home, UserCheck, Plus, X, Phone, FileSpreadsheet, Search, LayoutGrid, List, DoorOpen, Users } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import ActivationCodeModal, { CodeEntry } from '@/components/ActivationCodeModal';
import ImportResidentsModal from '@/components/ImportResidentsModal';

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

// ─── Add Unit Modal ───────────────────────────────────────────────────────────

function AddUnitModal({ wingId, onClose, onSuccess }: { wingId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ number: '', floor: '0' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const number = form.number.trim();
    const floor = Number(form.floor);
    if (!number) { setError('Unit number is required'); return; }
    if (number.length > 20) { setError('Unit number can be at most 20 characters'); return; }
    if (!Number.isInteger(floor) || floor < 0 || floor > 200) { setError('Floor must be a whole number from 0 (ground) to 200'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/superadmin/wings/${wingId}/flats`, { number, floor });
      toast.success(`Unit ${number} added`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not add the unit');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Add a unit</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close"><X size={18} className="text-gray-500" /></button>
        </div>
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Unit number *</label>
            <input autoFocus value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="e.g. A-1204 or Villa 12"
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Floor</label>
            <input type="number" min={0} max={200} value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Use floor 0 for ground-level homes like bungalows and plots.</p>
        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 bg-white shadow-xs rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Adding…' : 'Add unit'}
          </button>
        </div>
      </div>
    </div>
  );
}

const floorLabel = (f: number) => (f === 0 ? 'Ground' : `Floor ${f}`);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const societyId = params.id as string;
  const wingId = params.wingId as string;

  const [wing, setWing] = useState<WingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecretary, setShowSecretary] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [query, setQuery] = useState('');
  const [occupancy, setOccupancy] = useState<'ALL' | 'OCCUPIED' | 'VACANT'>('ALL');
  const [unitView, setUnitView] = useState<'map' | 'list'>('map');
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

  const visibleFlats = useMemo(() => {
    if (!wing) return [];
    const q = query.trim().toLowerCase();
    return wing.flats
      .filter(f => occupancy === 'ALL' || (occupancy === 'OCCUPIED') === (f.users.length > 0))
      .filter(f => !q || f.number.toLowerCase().includes(q) || f.users.some(u => u.name.toLowerCase().includes(q) || u.phone.includes(q)))
      .sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number, undefined, { numeric: true }));
  }, [wing, query, occupancy]);

  const floors = useMemo(() => {
    const m = new Map<number, Flat[]>();
    visibleFlats.forEach(f => m.set(f.floor, [...(m.get(f.floor) ?? []), f]));
    return Array.from(m.entries()).sort((a, b) => b[0] - a[0]);
  }, [visibleFlats]);

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
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/dashboard/societies/${societyId}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> {wing.society.name}
        </button>
        <div className="relative overflow-hidden bg-hero rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-900/20">
          <div className="absolute inset-0 bg-grid opacity-50" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
              <Home size={24} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sun-300">Block</p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white truncate">{wing.name}</h1>
              <p className="text-sm text-white/70">{wing.society.name}</p>
            </div>
          </div>
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
            {[
              { label: 'Units', value: stats.totalFlats, icon: Home },
              { label: 'Occupied', value: stats.occupiedFlats, icon: UserCheck },
              { label: 'Vacant', value: stats.vacantFlats, icon: DoorOpen },
              { label: 'Residents', value: stats.totalResidents, icon: Users },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm px-4 py-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white/15 text-sun-300 flex items-center justify-center flex-shrink-0"><s.icon size={17} /></span>
                <div>
                  <p className="text-xl font-semibold text-white tabular-nums leading-tight">{s.value.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-white/60">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
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

      {/* Units */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm">
        <div className="p-5 border-b border-gray-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Units ({wing.flats.length})</h2>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> Occupied {stats.occupiedFlats}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-gray-300 rounded-full" /> Vacant {stats.vacantFlats}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 px-3 py-2 rounded-xl border border-blue-100 hover:bg-blue-50">
                <FileSpreadsheet size={14} /> Import Excel
              </button>
              <button onClick={() => setShowAddUnit(true)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700">
                <Plus size={14} /> Add unit
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search unit, resident or phone…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-2">
              <div className="flex p-1 bg-gray-100 rounded-xl gap-0.5">
                {(['ALL', 'OCCUPIED', 'VACANT'] as const).map(o => (
                  <button key={o} onClick={() => setOccupancy(o)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${occupancy === o ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {o === 'ALL' ? 'All' : o === 'OCCUPIED' ? 'Occupied' : 'Vacant'}
                  </button>
                ))}
              </div>
              <div className="flex p-1 bg-gray-100 rounded-xl gap-0.5">
                {([['map', LayoutGrid], ['list', List]] as const).map(([v, Icon]) => (
                  <button key={v} onClick={() => setUnitView(v)} aria-label={`${v} view`}
                    className={`p-1.5 rounded-lg ${unitView === v ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}>
                    <Icon size={15} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {wing.flats.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Home size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No units yet</p>
            <button onClick={() => setShowAddUnit(true)} className="mt-2 text-sm font-semibold text-blue-600 hover:underline">Add a unit</button>
          </div>
        ) : visibleFlats.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400">No units match.</p>
        ) : unitView === 'map' ? (
          <div className="p-5 space-y-4">
            {floors.map(([floor, list]) => (
              <div key={floor} className="flex gap-3">
                <div className="w-16 flex-shrink-0 pt-2">
                  <p className="text-xs font-semibold text-gray-700">{floorLabel(floor)}</p>
                  <p className="text-[11px] text-gray-400">{list.length} unit{list.length === 1 ? '' : 's'}</p>
                </div>
                <div className="flex-1 grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                  {list.map(flat => {
                    const residents = flat.users.filter(u => u.role === 'RESIDENT');
                    const occupied = flat.users.length > 0;
                    return (
                      <div key={flat.id} title={residents.map(r => `${r.name} (${r.phone})`).join('\n') || 'Vacant'}
                        className={`rounded-xl px-3 py-2 ring-1 ring-inset ${occupied ? 'bg-emerald-50/70 ring-emerald-200' : 'bg-gray-50 ring-gray-200/70'}`}>
                        <p className={`text-sm font-semibold tabular-nums truncate ${occupied ? 'text-emerald-800' : 'text-gray-500'}`}>{flat.number}</p>
                        <p className="text-[11px] text-gray-500 truncate">{residents.length ? residents.map(r => r.name).join(', ') : 'Vacant'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visibleFlats.map(flat => {
              const residents = flat.users.filter(u => u.role === 'RESIDENT');
              const occupied = flat.users.length > 0;
              return (
                <div key={flat.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`min-w-12 h-9 px-2 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      occupied ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15' : 'bg-gray-50 text-gray-400'
                    }`}>
                      {flat.number}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {residents.length > 0 ? residents.map(r => r.name).join(', ') : 'Vacant'}
                      </p>
                      <p className="text-xs text-gray-400">{floorLabel(flat.floor)}</p>
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

      {showAddUnit && (
        <AddUnitModal wingId={wing.id} onClose={() => setShowAddUnit(false)} onSuccess={() => { setShowAddUnit(false); fetchWing(); }} />
      )}
      {showImport && (
        <ImportResidentsModal wingId={wing.id} wingName={wing.name} onClose={() => setShowImport(false)} onDone={fetchWing} />
      )}
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
