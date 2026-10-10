'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, X, Building2, Percent, Edit2 } from 'lucide-react';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubAdmin {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'STATE_ADMIN' | 'CITY_ADMIN' | 'AREA_PARTNER' | 'CUSTOM';
  region: string;
  regionType: string;
  parentId?: string;
  parent?: { id: string; name: string; role: string } | null;
  commissionPct: number;
  isActive: boolean;
  createdAt: string;
  _count?: { children: number; societies: number };
  children?: SubAdmin[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  STATE_ADMIN: 'State',
  CITY_ADMIN: 'City',
  AREA_PARTNER: 'Area',
  CUSTOM: 'Custom',
};

const ROLE_COLORS: Record<string, string> = {
  STATE_ADMIN: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  CITY_ADMIN: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
  AREA_PARTNER: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
  CUSTOM: 'bg-gray-100 text-gray-700',
};

// ─── Add Partner Modal ────────────────────────────────────────────────────────

function guessChildRole(parentRole: string): string {
  if (parentRole === 'STATE_ADMIN') return 'CITY_ADMIN';
  if (parentRole === 'CITY_ADMIN') return 'AREA_PARTNER';
  return 'AREA_PARTNER';
}

function guessChildRegionType(parentRole: string): string {
  if (parentRole === 'STATE_ADMIN') return 'City';
  if (parentRole === 'CITY_ADMIN') return 'Area';
  return 'Area';
}

function AddPartnerModal({
  onClose, onSuccess, preselectedParent, partners,
}: {
  onClose: () => void;
  onSuccess: () => void;
  preselectedParent?: SubAdmin | null;
  partners: SubAdmin[];
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: preselectedParent ? guessChildRole(preselectedParent.role) : 'STATE_ADMIN',
    region: '',
    regionType: preselectedParent ? guessChildRegionType(preselectedParent.role) : 'State',
    parentId: preselectedParent?.id ?? '',
    commissionPct: '20',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const ROLE_REGION_MAP: Record<string, string> = {
    STATE_ADMIN: 'State', CITY_ADMIN: 'City', AREA_PARTNER: 'Area', CUSTOM: 'Custom',
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setForm(f => ({
      ...f, [key]: val,
      ...(key === 'role' ? { regionType: ROLE_REGION_MAP[val] ?? 'Custom' } : {}),
    }));
  };

  const filteredParents = partners.filter(p => {
    if (form.role === 'STATE_ADMIN') return false;
    if (form.role === 'CITY_ADMIN') return p.role === 'STATE_ADMIN';
    if (form.role === 'AREA_PARTNER') return p.role === 'STATE_ADMIN' || p.role === 'CITY_ADMIN';
    return true;
  });

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.password || !form.region) {
      setError('Name, phone, password and region are required'); return;
    }
    if (form.phone.length !== 10) { setError('Phone must be 10 digits'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post('/subadmin', {
        name: form.name, phone: form.phone, email: form.email || undefined,
        password: form.password, role: form.role, region: form.region,
        regionType: form.regionType, parentId: form.parentId || undefined,
        commissionPct: parseFloat(form.commissionPct) || 20,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create partner');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Add Partner</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Full Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="Partner's full name"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Phone * (+91)</label>
              <input value={form.phone} onChange={set('phone')} placeholder="10 digits" maxLength={10}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input value={form.email} onChange={set('email')} placeholder="optional"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password *</label>
            <input value={form.password} onChange={set('password')} type="password" placeholder="Portal login password"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Partner Level *</label>
            <select value={form.role} onChange={set('role')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
              <option value="STATE_ADMIN">State Admin — manages entire state</option>
              <option value="CITY_ADMIN">City Admin — manages a city</option>
              <option value="AREA_PARTNER">Area Partner — manages specific area/locality</option>
              <option value="CUSTOM">Custom — custom region</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Region Name *</label>
              <input value={form.region} onChange={set('region')} placeholder="e.g. Gujarat, Vadodara"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Region Type</label>
              <input value={form.regionType} onChange={set('regionType')} placeholder="State / City / Area"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          {filteredParents.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Parent Partner</label>
              <select value={form.parentId} onChange={set('parentId')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                <option value="">No parent (reports to MySwarg HQ)</option>
                {filteredParents.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.regionType}: {p.region})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Commission % (0–50)</label>
            <input value={form.commissionPct} onChange={set('commissionPct')} type="number" min="0" max="50"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 bg-white shadow-xs rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-600/20 transition-all">
            {submitting ? 'Adding...' : 'Add Partner'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Compact Tree Node ─────────────────────────────────────────────────────────

function CompactNode({
  node, level, onSelect, selectedId,
}: {
  node: SubAdmin;
  level: number;
  onSelect: (n: SubAdmin) => void;
  selectedId?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-r-2 ${
          isSelected ? 'bg-blue-50 border-blue-600' : 'border-transparent'
        }`}
        style={{ paddingLeft: `${16 + level * 20}px`, paddingRight: '12px' }}
      >
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 text-xs"
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </div>
        )}
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isSelected ? '#095A51' : '#EEF4F2' }}
        >
          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
            {node.name?.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
            {node.name}
          </p>
          <p className="text-xs text-gray-400 truncate">{node.region}</p>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[node.role] ?? ROLE_COLORS.CUSTOM}`}>
          {node._count?.societies ?? 0}
        </span>
      </div>
      {expanded && node.children?.map(child => (
        <CompactNode key={child.id} node={child} level={level + 1} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
}

// ─── Partner Detail Panel ─────────────────────────────────────────────────────

function PartnerDetailPanel({
  partner, partners, onAddSubPartner, onNavigate,
}: {
  partner: SubAdmin;
  partners: SubAdmin[];
  onAddSubPartner: (parent: SubAdmin) => void;
  onNavigate: (id: string) => void;
}) {
  const subPartners = partners.filter(p => p.parentId === partner.id);
  const societyCount = partner._count?.societies ?? 0;
  const estRevenue = societyCount * 999;
  const commission = Math.round(estRevenue * partner.commissionPct / 100);
  const est3Month = commission * 3;

  return (
    <div className="flex-1 space-y-4">
      {/* Card 1 — Partner Info */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{partner.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold tracking-tight text-gray-900">{partner.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[partner.role] ?? ROLE_COLORS.CUSTOM}`}>
                {ROLE_LABELS[partner.role] ?? partner.role}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${partner.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15'}`}>
                {partner.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{partner.phone}{partner.email ? ` · ${partner.email}` : ''}</p>
          </div>
          <button
            onClick={() => onNavigate(partner.id)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl text-sm hover:bg-gray-50 flex-shrink-0"
          >
            <Edit2 size={13} /> Edit
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-5">
          {[
            { label: 'Region', value: partner.region },
            { label: 'Region Type', value: partner.regionType },
            { label: 'Commission', value: `${partner.commissionPct}%` },
            { label: 'Parent', value: partner.parent?.name ?? 'MySwarg HQ' },
            { label: 'Societies', value: societyCount },
            { label: 'Sub-Partners', value: partner._count?.children ?? 0 },
            { label: 'Joined', value: new Date(partner.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-400">{label}</span>
              <span className="font-medium text-gray-800">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onAddSubPartner(partner)}
            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all"
          >
            + Add Sub-Partner
          </button>
          <button className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
            Assign Society
          </button>
        </div>
      </div>

      {/* Card 3 — Sub-Partners */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Direct Sub-Partners</h3>
          <span className="text-xs bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/15 px-2 py-0.5 rounded-full font-medium">{subPartners.length}</span>
        </div>
        {subPartners.length === 0 ? (
          <div className="py-6 text-center">
            <Users size={28} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">No sub-partners yet</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {subPartners.map(sp => (
              <div
                key={sp.id}
                onClick={() => onNavigate(sp.id)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 text-xs font-bold">{sp.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{sp.name}</p>
                  <p className="text-xs text-gray-400">{sp.region}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[sp.role] ?? ROLE_COLORS.CUSTOM}`}>
                  {ROLE_LABELS[sp.role]}
                </span>
                <span className="text-xs text-gray-400">{sp._count?.societies ?? 0} soc</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => onAddSubPartner(partner)}
          className="w-full py-2 border border-dashed border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          + Add Sub-Partner under {partner.name}
        </button>
      </div>

      {/* Card 4 — Commission */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Percent size={16} className="text-blue-500" />
          <h3 className="text-base font-semibold text-gray-800">Commission</h3>
        </div>
        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Commission rate</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums text-gray-900">{partner.commissionPct}%</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b border-gray-50">
            <span className="text-gray-500">Est. monthly ({societyCount} societies)</span>
            <span className="font-semibold text-gray-800">₹{commission.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">3-month estimate</span>
            <span className="font-semibold text-gray-800">₹{est3Month.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <button className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all">
          Pay Commission
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<SubAdmin[]>([]);
  const [hierarchy, setHierarchy] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<SubAdmin | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<SubAdmin | null>(null);
  const [search, setSearch] = useState('');

  const fetchPartners = useCallback(async () => {
    try {
      const [listRes, hierarchyRes] = await Promise.all([
        api.get('/subadmin'),
        api.get('/subadmin/hierarchy'),
      ]);
      setPartners(listRes.data.data || []);
      setHierarchy(hierarchyRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const filteredHierarchy = search
    ? (function filterTree(nodes: SubAdmin[]): SubAdmin[] {
        return nodes.reduce<SubAdmin[]>((acc, n) => {
          const match = n.name.toLowerCase().includes(search.toLowerCase()) ||
            n.region.toLowerCase().includes(search.toLowerCase());
          const filteredChildren = filterTree(n.children ?? []);
          if (match || filteredChildren.length > 0) {
            acc.push({ ...n, children: filteredChildren });
          }
          return acc;
        }, []);
      })(hierarchy)
    : hierarchy;

  const handleAddChild = (parent: SubAdmin) => {
    setSelectedParent(parent);
    setShowAddModal(true);
  };

  const handleNavigate = (id: string) => {
    router.push(`/dashboard/partners/${id}`);
  };

  const totalCommission = partners
    .filter(p => p.isActive && (p._count?.societies ?? 0) > 0)
    .reduce((sum, p) => sum + Math.round((p._count?.societies ?? 0) * 999 * p.commissionPct / 100), 0);

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Partner Network</h1>
          <p className="text-sm text-gray-500 mt-1">{partners.length} partners registered</p>
        </div>
        <button
          onClick={() => { setSelectedParent(null); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all"
        >
          <Plus size={16} /> Add Partner
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Partners', value: partners.length, color: 'text-gray-900' },
          { label: 'Active', value: partners.filter(p => p.isActive).length, color: 'text-emerald-600' },
          { label: 'Est. Commission', value: `₹${totalCommission.toLocaleString('en-IN')}`, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/70 shadow-sm">
            <p className={`text-2xl font-semibold tracking-tight tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Split Panel */}
      <div className="flex gap-5 items-start">
        {/* Left Panel — Compact Tree */}
        <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Partner Network</p>
              <p className="text-xs text-gray-400">{partners.length} partners</p>
            </div>
            <button
              onClick={() => { setSelectedParent(null); setShowAddModal(true); }}
              className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700"
            >
              <Plus size={14} className="text-white" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search partners..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50"
              />
            </div>
          </div>

          {/* MySwarg HQ Root */}
          <div className="px-4 py-3 bg-mint-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/mark.png" alt="MySwarg" className="w-7 h-7 object-contain" />
              <div>
                <p className="text-xs font-bold text-gray-900">MySwarg HQ</p>
                <p className="text-xs text-gray-400">Super Admin</p>
              </div>
            </div>
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
              </div>
            ) : filteredHierarchy.length === 0 ? (
              <div className="p-6 text-center">
                <Users size={28} className="mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">
                  {search ? 'No matches' : 'No partners yet'}
                </p>
              </div>
            ) : (
              filteredHierarchy.map(node => (
                <CompactNode
                  key={node.id}
                  node={node}
                  level={0}
                  onSelect={setSelectedPartner}
                  selectedId={selectedPartner?.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel — Detail */}
        <div className="flex-1">
          {!selectedPartner ? (
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
              <Users size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">Select a partner from the list to view details</p>
              <button
                onClick={() => { setSelectedParent(null); setShowAddModal(true); }}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Or add your first partner →
              </button>
            </div>
          ) : (
            <PartnerDetailPanel
              key={selectedPartner.id}
              partner={selectedPartner}
              partners={partners}
              onAddSubPartner={handleAddChild}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      </div>

      {showAddModal && (
        <AddPartnerModal
          onClose={() => { setShowAddModal(false); setSelectedParent(null); }}
          onSuccess={() => {
            fetchPartners();
            setShowAddModal(false);
            setSelectedParent(null);
          }}
          preselectedParent={selectedParent}
          partners={partners}
        />
      )}
    </div>
  );
}
