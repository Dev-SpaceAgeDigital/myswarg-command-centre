'use client';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, ChevronRight, MoreVertical, Eye, Trash2, X, CheckCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import ActivationCodeModal, { ActivationInfo } from '@/components/ActivationCodeModal';

const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), { ssr: false });

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

const STATES = [
  'Gujarat', 'Maharashtra', 'Rajasthan', 'Delhi', 'Karnataka',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Punjab', 'Other',
];

// ─── Add Society Wizard ───────────────────────────────────────────────────────

type WizardStep = 'society' | 'wing' | 'success';

interface CreatedSociety { id: string; name: string; }
interface CreatedWing { name: string; flatsCreated: number; secretaryName?: string; }

function AddSocietyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (societyId: string) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('society');
  const [createdSociety, setCreatedSociety] = useState<CreatedSociety | null>(null);
  const [createdWing, setCreatedWing] = useState<CreatedWing | null>(null);
  const [secretaryCode, setSecretaryCode] = useState<ActivationInfo | null>(null);
  const [secretaryProblem, setSecretaryProblem] = useState('');
  const [showCode, setShowCode] = useState(false);

  // Step 1 state
  const [form, setForm] = useState({ name: '', address: '', city: '', state: 'Gujarat', pinCode: '' });
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  // Step 2 state
  const [wingForm, setWingForm] = useState({ name: '', floors: '', flatsPerFloor: '', secretaryName: '', secretaryPhone: '' });
  const [wingSubmitting, setWingSubmitting] = useState(false);
  const [wingError, setWingError] = useState('');
  const setW = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setWingForm(f => ({ ...f, [key]: e.target.value }));
  const totalFlats = wingForm.floors && wingForm.flatsPerFloor
    ? Number(wingForm.floors) * Number(wingForm.flatsPerFloor) : 0;

  const handleCreateSociety = async () => {
    if (!form.name || !form.address || !form.city) {
      setError('Name, address and city are required'); return;
    }
    setSubmitting(true); setError('');
    try {
      const payload = {
        ...form,
        ...(location ? { latitude: location.lat, longitude: location.lng, mapAddress: location.address } : {}),
      };
      const res = await api.post('/superadmin/societies', payload);
      setCreatedSociety({ id: res.data.data.id, name: res.data.data.name });
      setStep('wing');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create society');
    } finally { setSubmitting(false); }
  };

  const handleCreateWing = async () => {
    if (!wingForm.name || !wingForm.floors || !wingForm.flatsPerFloor) {
      setWingError('Wing name, floors and flats per floor are required'); return;
    }
    if (!createdSociety) return;
    setWingSubmitting(true); setWingError('');
    try {
      const payload: Record<string, unknown> = {
        name: wingForm.name, society_id: createdSociety.id,
        total_floors: Number(wingForm.floors), flats_per_floor: Number(wingForm.flatsPerFloor),
        auto_generate_flats: true,
      };
      if (wingForm.secretaryName && wingForm.secretaryPhone) {
        payload.secretary_name = wingForm.secretaryName;
        payload.secretary_phone = wingForm.secretaryPhone;
      }
      const res = await api.post('/superadmin/wings', payload);
      setCreatedWing({
        name: res.data.data.name,
        flatsCreated: res.data.data.flatsCreated ?? totalFlats,
        secretaryName: wingForm.secretaryName || undefined,
      });
      setSecretaryCode(res.data.data.secretaryActivation ?? null);
      setSecretaryProblem(res.data.data.secretaryError ?? '');
      setShowCode(!!res.data.data.secretaryActivation);
      setStep('success');
      onSuccess(createdSociety.id);
    } catch (err: any) {
      setWingError(err.response?.data?.message || 'Failed to create wing');
    } finally { setWingSubmitting(false); }
  };

  const handleSkipWing = () => { setStep('success'); if (createdSociety) onSuccess(createdSociety.id); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const stepLabels = ['Society Details', 'Add Wing', 'Done'];
  const stepIndex = step === 'society' ? 0 : step === 'wing' ? 1 : 2;

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">
              {step === 'society' ? 'Add New Society' : step === 'wing' ? 'Add First Wing' : 'Setup Complete'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {stepLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${i <= stepIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <span className={`text-xs ${i === stepIndex ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{label}</span>
                  {i < stepLabels.length - 1 && <span className="text-gray-200 text-xs">→</span>}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* ── Step 1: Society details ── */}
          {step === 'society' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Society Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Swastik Heights"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Address *</label>
                <input value={form.address} onChange={set('address')} placeholder="Street address"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">City *</label>
                  <input value={form.city} onChange={set('city')} placeholder="e.g. Ahmedabad"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Pin Code</label>
                  <input value={form.pinCode} onChange={set('pinCode')} placeholder="6-digit" maxLength={6}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">State *</label>
                <select value={form.state} onChange={set('state')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white">
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Location */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Pin on Map</p>
                    <p className="text-xs text-gray-400 mt-0.5">Optional — helps residents find the society</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMap(m => !m)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${showMap ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showMap ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {showMap && (
                  <MapPicker
                    onLocationSelect={(lat, lng, address) => setLocation({ lat, lng, address })}
                    initialLat={location?.lat}
                    initialLng={location?.lng}
                  />
                )}
                {!showMap && location && (
                  <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
                    <MapPin size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">{location.address}</p>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 bg-white shadow-xs rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleCreateSociety} disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Society →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Add Wing ── */}
          {step === 'wing' && createdSociety && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-xl text-sm text-green-700 flex items-center gap-2">
                <CheckCircle size={16} /> <span><strong>{createdSociety.name}</strong> created! Now add a wing.</span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Wing Name *</label>
                <input value={wingForm.name} onChange={setW('name')} placeholder="e.g. Tower-A"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Total Floors *</label>
                  <input type="number" min={1} value={wingForm.floors} onChange={setW('floors')} placeholder="e.g. 10"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Flats per Floor *</label>
                  <input type="number" min={1} value={wingForm.flatsPerFloor} onChange={setW('flatsPerFloor')} placeholder="e.g. 4"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              {totalFlats > 0 && (
                <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  Will auto-generate <strong>{totalFlats} flats</strong> ({wingForm.floors} floors × {wingForm.flatsPerFloor} flats)
                </p>
              )}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Secretary (Optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Name</label>
                    <input value={wingForm.secretaryName} onChange={setW('secretaryName')} placeholder="Secretary name"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Phone</label>
                    <input value={wingForm.secretaryPhone} onChange={setW('secretaryPhone')} placeholder="10-digit mobile" maxLength={10}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>
              {wingError && <p className="text-sm text-red-500">{wingError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSkipWing}
                  className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700">
                  Skip for now
                </button>
                <button onClick={handleCreateWing} disabled={wingSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {wingSubmitting ? 'Creating...' : 'Create Wing →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Success ── */}
          {step === 'success' && createdSociety && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-gray-900 mb-1">{createdSociety.name} is ready!</h3>
              <p className="text-sm text-gray-400 mb-6">Your new society has been set up</p>
              {showCode && secretaryCode && createdWing && (
                <ActivationCodeModal
                  title="Share with the Secretary"
                  entries={[{ name: createdWing.secretaryName ?? 'Secretary', phone: wingForm.secretaryPhone, activation: secretaryCode }]}
                  onClose={() => setShowCode(false)}
                />
              )}
              {secretaryProblem && (
                <div className="mb-4 p-3 rounded-xl bg-orange-50 text-sm text-orange-700 text-left">
                  The wing was created, but the Secretary could not be added: {secretaryProblem}
                </div>
              )}
              {secretaryCode && !showCode && (
                <button onClick={() => setShowCode(true)} className="mb-4 text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Show the Secretary's activation code again
                </button>
              )}
              <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Society</span>
                  <span className="font-medium text-gray-900">{createdSociety.name}</span>
                </div>
                {createdWing ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Wing</span>
                      <span className="font-medium text-gray-900">{createdWing.name}</span>
                    </div>
                    {createdWing.flatsCreated > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Flats created</span>
                        <span className="font-medium text-gray-900">{createdWing.flatsCreated}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Secretary</span>
                      <span className="font-medium text-gray-900">{createdWing.secretaryName || 'Not assigned'}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Wings</span>
                    <span className="text-gray-400">None added yet</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Trial ends</span>
                  <span className="font-medium text-orange-600">30 days from today</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { onClose(); setForm({ name: '', address: '', city: '', state: 'Gujarat', pinCode: '' }); setWingForm({ name: '', floors: '', flatsPerFloor: '', secretaryName: '', secretaryPhone: '' }); setStep('society'); setCreatedSociety(null); setCreatedWing(null); }}
                  className="flex-1 py-2.5 border border-gray-200 bg-white shadow-xs rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Add Another
                </button>
                <button
                  onClick={() => { onClose(); router.push(`/dashboard/societies/${createdSociety.id}`); }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  View Society
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

function SocietyCard({ society, onDelete, onView }: {
  society: Society;
  onDelete: () => void;
  onView: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const totalFlats = society.wings?.reduce((sum, w) => sum + (w.flatsCount ?? 0), 0) ?? 0;

  return (
    <div className="group bg-white rounded-2xl p-5 border border-gray-200/70 shadow-sm hover:shadow-xl hover:shadow-gray-900/[0.06] hover:border-blue-200/70 hover:-translate-y-1 transition-all duration-300 relative cursor-pointer" onClick={onView}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/25 group-hover:scale-105 transition-transform duration-300">
            <Building2 size={19} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-gray-900 text-[15px] leading-tight tracking-tight">{society.name}</h3>
              {society.latitude && society.longitude && (
                <MapPin size={12} className="text-blue-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{society.city}, {society.state}</p>
          </div>
        </div>
        <div ref={menuRef} className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-60 group-hover:opacity-100"
          >
            <MoreVertical size={16} className="text-gray-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl ring-1 ring-gray-900/5 z-10 min-w-40 p-1 animate-scale-in origin-top-right">
              <button
                onClick={(e) => { e.stopPropagation(); onView(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <Eye size={14} /> View Details
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Wings', value: society.wings?.length ?? 0 },
          { label: 'Flats', value: totalFlats },
        ].map(s => (
          <div key={s.label} className="px-3 py-2.5 bg-gray-50 ring-1 ring-inset ring-gray-100 rounded-xl">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {society.wings && society.wings.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {society.wings.slice(0, 4).map(wing => (
            <span key={wing.id} className="text-xs bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/15 font-medium px-2.5 py-0.5 rounded-md">
              {wing.name}
            </span>
          ))}
          {society.wings.length > 4 && (
            <span className="text-xs bg-gray-100 text-gray-500 font-medium px-2.5 py-0.5 rounded-md">
              +{society.wings.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          society.subscriptionStatus === 'EXPIRED' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15' : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15'
        }`}>
          {society.subscriptionStatus === 'EXPIRED' ? '● Expired' : '● Active'}
        </span>
        <button onClick={onView} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
          View Details <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocietiesPage() {
  const router = useRouter();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const filtered = societies.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Societies</h1>
          <p className="text-sm text-gray-500 mt-1">{societies.length} societies registered</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all"
        >
          <Plus size={16} /> Add Society
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by society name or city..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/70 shadow-sm">
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-gray-900">{societies.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Societies</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/70 shadow-sm">
          <p className="text-2xl font-semibold tracking-tight text-emerald-600 tabular-nums">
            {societies.filter(s => s.subscriptionStatus !== 'EXPIRED').length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Active</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/70 shadow-sm">
          <p className="text-2xl font-semibold tracking-tight text-blue-600 tabular-nums">
            {societies.reduce((sum, s) => sum + (s.wings?.length ?? 0), 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total Wings</p>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="skeleton h-4 w-3/4 mb-3" />
              <div className="skeleton h-3 w-1/2 mb-6" />
              <div className="flex gap-2">
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-gray-300 text-center">
          <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-b from-gray-50 to-gray-100 ring-1 ring-inset ring-gray-200/70 rounded-2xl flex items-center justify-center shadow-sm">
            <Building2 size={26} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No societies found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first society to get started</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            Add Society
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(society => (
            <SocietyCard
              key={society.id}
              society={society}
              onDelete={() => { setSelectedSociety(society); setShowDeleteConfirm(true); }}
              onView={() => router.push(`/dashboard/societies/${society.id}`)}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddSocietyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(newId) => { setShowAddModal(false); router.push(`/dashboard/societies/${newId}`); }}
        />
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
