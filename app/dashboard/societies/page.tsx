'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Plus, Search, ChevronRight, MoreVertical, Eye, Trash2, MapPin,
  LayoutGrid, List, Home, Layers, CircleCheck, X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import AddSocietyWizard from '@/components/structure/AddSocietyWizard';

interface Wing {
  id: string;
  name: string;
  flatsCount: number;
  residentCount: number;
  isActive: boolean;
}

interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pinCode?: string;
  subscriptionStatus: string;
  wings: Wing[];
  latitude?: number | null;
  longitude?: number | null;
  mapAddress?: string | null;
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  society, onClose, onConfirm,
}: { society: Society; onClose: () => void; onConfirm: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/superadmin/societies/${society.id}`);
      toast.success('Society deleted');
      onConfirm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete society');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 bg-red-50 ring-1 ring-inset ring-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-gray-900">Delete {society.name}?</h2>
            <p className="text-sm text-gray-500 mt-1">
              This will permanently delete the society and all its wings, flats, residents and data. This cannot be undone.
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
            {deleting ? 'Deleting...' : 'Delete Society'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Society Card ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: 'bg-emerald-500' },
  TRIAL: { label: 'Trial', cls: 'bg-sun-50 text-sun-800 ring-sun-600/20', dot: 'bg-sun-500' },
  EXPIRED: { label: 'Expired', cls: 'bg-red-50 text-red-700 ring-red-600/15', dot: 'bg-red-500' },
};
const statusOf = (s: string) => STATUS[s] ?? STATUS.ACTIVE;

function StatusPill({ status }: { status: string }) {
  const st = statusOf(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset ${st.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
    </span>
  );
}

function RowMenu({ onView, onDelete }: { onView: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-label="More actions"
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl ring-1 ring-gray-900/5 z-10 min-w-40 p-1 animate-scale-in origin-top-right">
          <button onClick={(e) => { e.stopPropagation(); onView(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Eye size={14} /> View details
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

const unitsOf = (s: Society) => s.wings?.reduce((sum, w) => sum + (w.flatsCount ?? 0), 0) ?? 0;
const residentsOf = (s: Society) => s.wings?.reduce((sum, w) => sum + (w.residentCount ?? 0), 0) ?? 0;

function SocietyCard({ society, onDelete, onView }: { society: Society; onDelete: () => void; onView: () => void }) {
  const units = unitsOf(society);
  const residents = residentsOf(society);
  const occupancy = units ? Math.min(100, Math.round((residents / units) * 100)) : 0;

  return (
    <div onClick={onView}
      className="group relative bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:shadow-gray-900/[0.06] hover:border-blue-200/70 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-blue-400 to-sun-400 opacity-80" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/25 group-hover:scale-105 transition-transform duration-300">
              <Building2 size={19} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-[15px] leading-tight tracking-tight truncate">{society.name}</h3>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                {society.latitude && society.longitude ? <MapPin size={11} className="text-blue-500 flex-shrink-0" /> : null}
                {society.city}, {society.state}
              </p>
            </div>
          </div>
          <RowMenu onView={onView} onDelete={onDelete} />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Blocks', value: society.wings?.length ?? 0 },
            { label: 'Units', value: units },
            { label: 'Residents', value: residents },
          ].map((s) => (
            <div key={s.label} className="px-3 py-2.5 bg-gray-50 ring-1 ring-inset ring-gray-100 rounded-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
              <p className="text-lg font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">{s.value.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-gray-500 font-medium">Occupancy</span>
            <span className="font-semibold text-gray-700 tabular-nums">{occupancy}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${occupancy}%` }} />
          </div>
        </div>

        {society.wings && society.wings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {society.wings.slice(0, 4).map((wing) => (
              <span key={wing.id} className="text-[11px] bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/15 font-medium px-2 py-0.5 rounded-md">
                {wing.name}
              </span>
            ))}
            {society.wings.length > 4 && (
              <span className="text-[11px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-md">+{society.wings.length - 4} more</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <StatusPill status={society.subscriptionStatus} />
          <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
            Open <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Filter = 'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRED';
type View = 'grid' | 'list';

export default function SocietiesPage() {
  const router = useRouter();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [view, setView] = useState<View>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSociety, setSelectedSociety] = useState<Society | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchSocieties = async () => {
    try {
      const res = await api.get('/superadmin/societies');
      setSocieties(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSocieties(); }, []);

  const q = search.trim().toLowerCase();
  const filtered = societies.filter((s) =>
    (filter === 'ALL' || (s.subscriptionStatus || 'ACTIVE') === filter) &&
    (!q || s.name.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.wings?.some((w) => w.name.toLowerCase().includes(q))),
  );

  const count = (f: Filter) => f === 'ALL' ? societies.length : societies.filter((s) => (s.subscriptionStatus || 'ACTIVE') === f).length;
  const totalUnits = societies.reduce((sum, s) => sum + unitsOf(s), 0);
  const totalBlocks = societies.reduce((sum, s) => sum + (s.wings?.length ?? 0), 0);

  const stats = [
    { label: 'Societies', value: societies.length, icon: Building2, tint: 'bg-blue-50 text-blue-700 ring-blue-100' },
    { label: 'Active', value: count('ACTIVE') + count('TRIAL'), icon: CircleCheck, tint: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    { label: 'Blocks', value: totalBlocks, icon: Layers, tint: 'bg-sun-50 text-sun-700 ring-sun-100' },
    { label: 'Units', value: totalUnits, icon: Home, tint: 'bg-violet-50 text-violet-700 ring-violet-100' },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Hero */}
      <div className="relative overflow-hidden bg-hero rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-900/20">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sun-300">Portfolio</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1.5">Societies</h1>
            <p className="text-sm text-white/70 mt-1.5 max-w-md">
              Apartments, bungalows, row houses, tenements and plots — all managed from one place.
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="self-start sm:self-auto flex items-center gap-2 bg-sun-400 text-blue-900 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-sun-500/30 hover:bg-sun-300 hover:-translate-y-0.5 transition-all">
            <Plus size={17} strokeWidth={2.5} /> Add society
          </button>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm px-4 py-3.5 flex items-center gap-3">
              <span className={`w-9 h-9 rounded-xl ring-1 ring-inset flex items-center justify-center ${s.tint}`}><s.icon size={17} /></span>
              <div>
                <p className="text-xl font-semibold text-white tabular-nums leading-tight">{loading ? '–' : s.value.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-white/60">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search society, city or block…"
            className="w-full pl-10 pr-9 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white" />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex p-1 bg-white border border-gray-200 rounded-xl shadow-xs gap-0.5">
            {(['ALL', 'ACTIVE', 'TRIAL', 'EXPIRED'] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}>
                {f === 'ALL' ? 'All' : statusOf(f).label}
                <span className={`ml-1.5 tabular-nums ${filter === f ? 'text-white/75' : 'text-gray-400'}`}>{count(f)}</span>
              </button>
            ))}
          </div>
          <div className="flex p-1 bg-white border border-gray-200 rounded-xl shadow-xs gap-0.5">
            {([['grid', LayoutGrid], ['list', List]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} aria-label={`${v} view`}
                className={`p-1.5 rounded-lg ${view === v ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:text-gray-700'}`}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="skeleton h-4 w-3/4 mb-3" />
              <div className="skeleton h-3 w-1/2 mb-6" />
              <div className="grid grid-cols-3 gap-2"><div className="skeleton h-12" /><div className="skeleton h-12" /><div className="skeleton h-12" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-dashed border-gray-300 text-center">
          <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-b from-mint-50 to-blue-50 ring-1 ring-inset ring-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
            {societies.length ? <Search size={24} className="text-blue-400" /> : <Building2 size={26} className="text-blue-500" />}
          </div>
          <p className="text-gray-800 font-semibold">{societies.length ? 'No societies match' : 'No societies yet'}</p>
          <p className="text-gray-500 text-sm mt-1">
            {societies.length ? 'Try a different search or filter.' : 'Set up your first society — towers, bungalows, tenements or plots.'}
          </p>
          {societies.length ? (
            <button onClick={() => { setSearch(''); setFilter('ALL'); }} className="mt-4 text-sm font-semibold text-blue-600 hover:underline">Clear filters</button>
          ) : (
            <button onClick={() => setShowAddModal(true)} className="mt-5 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">
              <Plus size={16} /> Add society
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((society) => (
            <SocietyCard key={society.id} society={society}
              onDelete={() => { setSelectedSociety(society); setShowDeleteConfirm(true); }}
              onView={() => router.push(`/dashboard/societies/${society.id}`)} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200/70 bg-gray-50/80">
                  <th className="text-left px-5 py-3">Society</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Blocks</th>
                  <th className="text-right px-4 py-3">Units</th>
                  <th className="text-right px-4 py-3">Residents</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} onClick={() => router.push(`/dashboard/societies/${s.id}`)}
                    className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 size={15} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">{s.city}, {s.state}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><StatusPill status={s.subscriptionStatus} /></td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-medium text-gray-700">{s.wings?.length ?? 0}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-medium text-gray-700">{unitsOf(s).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-medium text-gray-700">{residentsOf(s).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu onView={() => router.push(`/dashboard/societies/${s.id}`)} onDelete={() => { setSelectedSociety(s); setShowDeleteConfirm(true); }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddSocietyWizard onClose={() => setShowAddModal(false)} onCreated={fetchSocieties} />
      )}

      {showDeleteConfirm && selectedSociety && (
        <DeleteConfirmModal
          society={selectedSociety}
          onClose={() => { setShowDeleteConfirm(false); setSelectedSociety(null); }}
          onConfirm={() => { fetchSocieties(); setShowDeleteConfirm(false); setSelectedSociety(null); }}
        />
      )}
    </div>
  );
}
