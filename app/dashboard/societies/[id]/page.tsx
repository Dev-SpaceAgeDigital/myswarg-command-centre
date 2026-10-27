'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Building2, Home, Plus, X, ChevronRight,
  CreditCard, Edit2, AlertCircle, Phone, Trash2, ShieldCheck, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import ActivationCodeModal, { CodeEntry } from '@/components/ActivationCodeModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Secretary {
  id: string; name: string; phone: string; isPrimary: boolean;
  pin?: { status: 'ACTIVE' | 'CODE_PENDING' | 'CODE_EXPIRED' | 'NOT_ACTIVATED' };
}

const PIN_LABEL: Record<string, string> = {
  ACTIVE: 'PIN set', CODE_PENDING: 'Waiting for activation', CODE_EXPIRED: 'Code expired', NOT_ACTIVATED: 'Not activated',
};

interface Wing {
  id: string; name: string; flatsCount: number; residentCount: number; isActive: boolean;
}

interface Payment {
  id: string; amount: number; month: number; year: number; paidAt: string; method: string; reference?: string;
}

interface Society {
  id: string; name: string; address: string; city: string; state: string; pinCode?: string;
  subscriptionStatus: string; planType?: string; monthlyAmount?: number;
  subscriptionStart?: string; subscriptionEnd?: string; trialEndsAt?: string;
  notes?: string; wings: Wing[]; code?: string | null;
}

type Tab = 'overview' | 'wings' | 'financials';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysLeft(endDate?: string) {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Edit Society Modal ───────────────────────────────────────────────────────

const STATES = [
  'Gujarat', 'Maharashtra', 'Rajasthan', 'Delhi', 'Karnataka',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Punjab', 'Other',
];

function EditSocietyModal({
  society, onClose, onSuccess,
}: { society: Society; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: society.name, address: society.address, city: society.city,
    state: society.state, pinCode: society.pinCode ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.address || !form.city) { setError('Name, address and city are required'); return; }
    setSaving(true); setError('');
    try {
      await api.put(`/superadmin/societies/${society.id}`, form);
      toast.success('Society updated');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update society');
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Edit Society</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-500" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Society Name *</label>
            <input value={form.name} onChange={set('name')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Address *</label>
            <input value={form.address} onChange={set('address')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">City *</label>
              <input value={form.city} onChange={set('city')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Pin Code</label>
              <input value={form.pinCode} onChange={set('pinCode')} maxLength={6} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">State</label>
            <select value={form.state} onChange={set('state')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 bg-white shadow-xs rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Wing Modal ───────────────────────────────────────────────────────────

const LAYOUT_TYPES = [
  { value: 'FLOORS', label: 'Apartment building', sublabel: 'Multiple floors, flats stacked per floor' },
  { value: 'UNITS', label: 'Villas / Bungalows / Row houses', sublabel: 'Single-level units side by side, no floors' },
] as const;

function AddWingModal({
  societyId, onClose, onSuccess,
}: { societyId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', layoutType: 'FLOORS' as 'FLOORS' | 'UNITS',
    floors: '', flatsPerFloor: '', totalUnits: '', unitLabel: '',
    secretaryName: '', secretaryPhone: '',
  });
  const [issued, setIssued] = useState<CodeEntry[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const totalFlats = form.layoutType === 'FLOORS'
    ? (form.floors && form.flatsPerFloor ? Number(form.floors) * Number(form.flatsPerFloor) : 0)
    : (form.totalUnits ? Number(form.totalUnits) : 0);

  const handleSubmit = async () => {
    if (!form.name) { setError('Wing name is required'); return; }
    if (form.layoutType === 'FLOORS' && (!form.floors || !form.flatsPerFloor)) {
      setError('Total floors and flats per floor are required'); return;
    }
    if (form.layoutType === 'UNITS' && !form.totalUnits) {
      setError('Total number of units is required'); return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name, society_id: societyId,
        layout_type: form.layoutType,
        auto_generate_flats: true,
      };
      if (form.layoutType === 'FLOORS') {
        payload.total_floors = Number(form.floors);
        payload.flats_per_floor = Number(form.flatsPerFloor);
      } else {
        payload.total_units = Number(form.totalUnits);
        if (form.unitLabel) payload.unit_label = form.unitLabel;
      }
      if (form.secretaryName && form.secretaryPhone) {
        payload.secretary_name = form.secretaryName;
        payload.secretary_phone = form.secretaryPhone;
      }
      const res = await api.post('/superadmin/wings', payload);
      toast.success(`Wing "${form.name}" created`);
      const d = res.data?.data ?? {};
      if (d.secretaryError) toast.error(`Secretary not added: ${d.secretaryError}`);
      if (d.secretaryActivation) {
        setIssued([{ name: form.secretaryName, phone: form.secretaryPhone, activation: d.secretaryActivation }]);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create wing');
    } finally { setSubmitting(false); }
  };

  if (issued) {
    return <ActivationCodeModal title="Share with the Secretary" entries={issued} onClose={onSuccess} />;
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Add Wing</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-500" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Wing Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Tower-A or Greenwood Villas"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Layout *</label>
            <div className="grid grid-cols-1 gap-2">
              {LAYOUT_TYPES.map(lt => (
                <button
                  key={lt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, layoutType: lt.value }))}
                  className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                    form.layoutType === lt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-gray-900">{lt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{lt.sublabel}</p>
                </button>
              ))}
            </div>
          </div>

          {form.layoutType === 'FLOORS' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Total Floors *</label>
                <input type="number" min={1} value={form.floors} onChange={set('floors')} placeholder="e.g. 10"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Flats per Floor *</label>
                <input type="number" min={1} value={form.flatsPerFloor} onChange={set('flatsPerFloor')} placeholder="e.g. 4"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Total Units *</label>
                <input type="number" min={1} value={form.totalUnits} onChange={set('totalUnits')} placeholder="e.g. 40"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Unit Label</label>
                <input value={form.unitLabel} onChange={set('unitLabel')} placeholder="Defaults to wing name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          )}
          {totalFlats > 0 && (
            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              Will auto-generate <strong>{totalFlats} flat{totalFlats !== 1 ? 's' : ''}</strong>
              {form.layoutType === 'UNITS' && (
                <> — numbered {(form.unitLabel || form.name || 'Unit')}-01 through {(form.unitLabel || form.name || 'Unit')}-{String(totalFlats).padStart(2, '0')}</>
              )}
            </p>
          )}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Secretary (Optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.secretaryName} onChange={set('secretaryName')} placeholder="Secretary name"
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              <input value={form.secretaryPhone} onChange={set('secretaryPhone')} placeholder="10-digit mobile" maxLength={10}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 bg-white shadow-xs rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Wing'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Wing Modal ────────────────────────────────────────────────────────

function DeleteWingModal({
  wing, onClose, onSuccess,
}: { wing: Wing; onClose: () => void; onSuccess: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/superadmin/wings/${wing.id}`);
      toast.success('Wing deleted successfully');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete wing');
      setDeleting(false);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 bg-red-50 ring-1 ring-inset ring-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-gray-900">Delete {wing.name}?</h2>
            <p className="text-sm text-gray-500 mt-1">
              This will permanently delete the wing and all its flats, residents and data. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 bg-white shadow-xs rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {deleting ? 'Deleting...' : 'Delete Wing'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocietyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [society, setSociety] = useState<Society | null>(null);
  const [wingSecretaries, setWingSecretaries] = useState<Record<string, Secretary[]>>({});
  const [issuedCodes, setIssuedCodes] = useState<CodeEntry[] | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [showAddWing, setShowAddWing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteWing, setShowDeleteWing] = useState(false);
  const [wingToDelete, setWingToDelete] = useState<Wing | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchData = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/superadmin/societies');
      const found: Society | undefined = (res.data.data || []).find((s: Society) => s.id === id);
      if (!found) { router.push('/dashboard/societies'); return; }
      setSociety(found);
      setNotes(found.notes ?? '');

      const wingDetails = await Promise.all(found.wings.map(w => api.get(`/superadmin/wings/${w.id}`)));
      const map: Record<string, Secretary[]> = {};
      wingDetails.forEach((d, i) => { map[found.wings[i].id] = d.data.data?.users || []; });
      setWingSecretaries(map);

      try {
        const ph = await api.get(`/subscriptions/${id}/history`);
        setPayments(ph.data.data?.payments || []);
      } catch { /* payments may not exist yet */ }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load society');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveNotes = async () => {
    if (!society) return;
    setSavingNotes(true);
    try {
      await api.put(`/superadmin/societies/${id}`, { notes });
    } catch { /* silent */ } finally { setSavingNotes(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={fetchData} className="ml-auto text-sm text-red-600 underline">Retry</button>
      </div>
    );
  }

  if (!society) return null;

  const resetSecretaryPin = async (sec: Secretary) => {
    if (resettingId) return;
    if (!confirm(`Reset PIN for ${sec.name}? They will be signed out everywhere and need the new activation code.`)) return;
    setResettingId(sec.id);
    try {
      const res = await api.post(`/superadmin/users/${sec.id}/reset-pin`);
      const d = res.data.data;
      setIssuedCodes([{ name: d.name, phone: d.phone, activation: d.activation }]);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not reset the PIN');
    } finally {
      setResettingId(null);
    }
  };

  const totalFlats = society.wings.reduce((sum, w) => sum + (w.flatsCount ?? 0), 0);
  const daysLeft = getDaysLeft(society.subscriptionEnd);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const allSecretaries = Object.values(wingSecretaries).flat();

  const statusColor = society.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15'
    : society.subscriptionStatus === 'TRIAL' ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/15'
    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'wings', label: `Wings (${society.wings.length})` },
    { key: 'financials', label: 'Financials' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => router.push('/dashboard/societies')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Societies
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 truncate">{society.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{society.address} · {society.city}, {society.state}{society.pinCode ? ` - ${society.pinCode}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>
              ● {society.subscriptionStatus}
            </span>
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl text-sm hover:bg-gray-50">
              <Edit2 size={14} /> Edit
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Wings',    value: society.wings.length, icon: Building2, color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Total Flats',    value: totalFlats,           icon: Home,      color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: daysLeft !== null ? (daysLeft > 0 ? `${daysLeft}d left` : 'Expired') : society.subscriptionStatus,
            value: society.planType ?? 'STARTER', icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-200/70 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Society info */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Society Details</h3>
            {[
              { label: 'Address', value: society.address },
              { label: 'City', value: society.city },
              { label: 'State', value: society.state },
              { label: 'Pin Code', value: society.pinCode || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
            {allSecretaries.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Secretaries</p>
                <div className="space-y-3">
                  {society.wings.flatMap((w) => (wingSecretaries[w.id] || []).map((sec) => (
                    <div key={sec.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 text-xs font-bold">{sec.name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{sec.name} <span className="text-xs text-gray-400 font-normal">· Wing {w.name}</span></p>
                          <p className="text-xs text-gray-400">
                            {sec.phone}
                            {sec.pin && (
                              <span className={sec.pin.status === 'ACTIVE' ? 'text-emerald-600' : 'text-orange-500'}> · {PIN_LABEL[sec.pin.status]}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => resetSecretaryPin(sec)}
                          disabled={resettingId === sec.id}
                          className="text-xs font-medium px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50"
                        >
                          {resettingId === sec.id ? 'Resetting…' : 'Reset PIN'}
                        </button>
                        <a href={`tel:${sec.phone}`} className="p-2 bg-green-50 rounded-lg hover:bg-green-100">
                          <Phone size={14} className="text-emerald-600" />
                        </a>
                      </div>
                    </div>
                  )))}
                </div>
              </div>
            )}
          </div>

          {/* Subscription info */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600" /> Guard sign-in code
              </h3>
              <p className="text-xs text-gray-400 mt-1 mb-3">
                Guards enter this code, pick their wing, then their own PIN. The Secretary sets guard PINs in the app.
              </p>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-xl font-bold tracking-[0.3em] text-gray-900">{society.code ?? '—'}</span>
                {society.code && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(society.code!); toast.success('Society code copied'); }}
                    className="p-2 hover:bg-gray-200 rounded-lg" title="Copy"
                  >
                    <Copy size={15} className="text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 space-y-3">
              <h3 className="text-base font-semibold text-gray-900">Subscription</h3>
              {[
                { label: 'Plan', value: society.planType ?? 'STARTER' },
                { label: 'Amount', value: `₹${(society.monthlyAmount ?? 499).toLocaleString('en-IN')}/mo` },
                { label: 'Started', value: fmt(society.subscriptionStart) },
                { label: 'Expires', value: fmt(society.subscriptionEnd) },
                { label: 'Days Left', value: daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Expired') : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-medium ${label === 'Days Left' && daysLeft !== null && daysLeft < 15 ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Notes</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={4}
                placeholder="Add notes about this society..."
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 resize-none"
              />
              <button onClick={saveNotes} disabled={savingNotes}
                className="mt-2 text-xs text-blue-600 hover:underline disabled:opacity-50">
                {savingNotes ? 'Saving...' : 'Save notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Wings tab ── */}
      {tab === 'wings' && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Wings ({society.wings.length})</h2>
            <button onClick={() => setShowAddWing(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus size={15} /> Add Wing
            </button>
          </div>
          {society.wings.length === 0 ? (
            <div className="p-12 text-center">
              <Home size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 text-sm">No wings yet</p>
              <button onClick={() => setShowAddWing(true)} className="mt-3 text-sm text-blue-600 hover:underline">
                Add the first wing
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {society.wings.map(wing => {
                const secs = wingSecretaries[wing.id] || [];
                const primary = secs.find(s => s.isPrimary) || secs[0];
                return (
                  <div key={wing.id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
      {issuedCodes && <ActivationCodeModal title="Share with the Secretary" entries={issuedCodes} onClose={() => setIssuedCodes(null)} />}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 ring-1 ring-inset ring-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Home size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{wing.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {primary ? `${primary.name} · ${primary.phone}` : 'No secretary assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center hidden sm:block">
                        <p className="text-sm font-semibold text-gray-900">{wing.flatsCount ?? 0}</p>
                        <p className="text-xs text-gray-400">Flats</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-sm font-semibold text-gray-900">{wing.residentCount ?? 0}</p>
                        <p className="text-xs text-gray-400">Residents</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setWingToDelete(wing); setShowDeleteWing(true); }}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete wing"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button onClick={() => router.push(`/dashboard/societies/${id}/wings/${wing.id}`)}
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View Wing <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Financials tab ── */}
      {tab === 'financials' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Plan', value: society.planType ?? 'STARTER' },
              { label: 'Monthly Amount', value: `₹${(society.monthlyAmount ?? 499).toLocaleString('en-IN')}` },
              { label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN')}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-gray-200/70 shadow-sm">
                <p className="text-xl font-semibold tracking-tight text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Payment History</h3>
              <button onClick={() => router.push(`/dashboard/subscriptions/${id}`)}
                className="text-sm text-blue-600 hover:underline">Full history →</button>
            </div>
            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard size={36} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">No payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200/70 bg-gray-50/80">
                      <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Month</th>
                      <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">Amount</th>
                      <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Method</th>
                      <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Paid On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 6).map(p => (
                      <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {new Date(p.year, p.month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-right text-green-700 font-medium">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-gray-500">{p.method}</td>
                        <td className="px-4 py-3 text-gray-400">{fmt(p.paidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddWing && (
        <AddWingModal societyId={id} onClose={() => setShowAddWing(false)} onSuccess={() => { fetchData(); setShowAddWing(false); }} />
      )}
      {showEdit && society && (
        <EditSocietyModal society={society} onClose={() => setShowEdit(false)} onSuccess={() => { fetchData(); setShowEdit(false); }} />
      )}
      {showDeleteWing && wingToDelete && (
        <DeleteWingModal
          wing={wingToDelete}
          onClose={() => { setShowDeleteWing(false); setWingToDelete(null); }}
          onSuccess={() => { fetchData(); setShowDeleteWing(false); setWingToDelete(null); }}
        />
      )}
    </div>
  );
}
