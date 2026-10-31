'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  X, Check, MapPin, Plus, Copy, Trash2, ArrowLeft, ArrowRight, Building, Sparkles,
  LoaderCircle, CircleCheck, TriangleAlert, KeyRound, RotateCcw,
} from 'lucide-react';
import api from '@/lib/api';
import ActivationCodeModal, { CodeEntry } from '@/components/ActivationCodeModal';
import {
  Block, BlockKind, PropertyType, PROPERTY_TYPES, BLOCK_KINDS, KIND_ORDER,
  createBlock, duplicateBlock, generateUnits, validateBlock, summarize, plural,
} from '@/lib/property-layout';
import { createBlock as createBlockOnServer, BlockResult, errorMessage } from '@/lib/create-structure';
import BlockEditor, { Field, inputCls, KIND_ICONS, KIND_TINTS } from './BlockEditor';

const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), { ssr: false });

const STATES = [
  'Gujarat', 'Maharashtra', 'Rajasthan', 'Delhi', 'Karnataka',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Punjab', 'Other',
];

type Step = 'details' | 'structure' | 'review' | 'done';
const STEPS: { key: Step; label: string; sub: string }[] = [
  { key: 'details', label: 'Society', sub: 'Name, address & type' },
  { key: 'structure', label: 'Structure', sub: 'Towers, houses, plots' },
  { key: 'review', label: 'Review', sub: 'Check and create' },
  { key: 'done', label: 'Done', sub: 'Share access' },
];

const PROPERTY_ICONS: Record<PropertyType, BlockKind> = {
  APARTMENTS: 'TOWER', BUNGALOWS: 'BUNGALOW', ROW_HOUSES: 'ROW_HOUSE', TENEMENTS: 'TENEMENT', PLOTS: 'PLOT', MIXED: 'CUSTOM',
};

interface BlockRun {
  state: 'pending' | 'creating' | 'done' | 'error';
  done: number;
  total: number;
  wingId?: string;
  activation?: CodeEntry['activation'];
  secretaryError?: string;
  result?: BlockResult;
  error?: string;
}

function starterBlocks(type: PropertyType): Block[] {
  const out: Block[] = [];
  for (const k of PROPERTY_TYPES[type].starter) out.push(createBlock(k, out));
  return out;
}

export default function AddSocietyWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');

  // Details
  const [form, setForm] = useState({ name: '', address: '', city: '', state: 'Gujarat', pinCode: '' });
  const [propertyType, setPropertyType] = useState<PropertyType>('APARTMENTS');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Structure
  const [blocks, setBlocks] = useState<Block[]>(() => starterBlocks('APARTMENTS'));
  const [structureTouched, setStructureTouched] = useState(false);
  const [activeKey, setActiveKey] = useState<string>(() => blocks[0]?.key ?? '');
  const active = blocks.find((b) => b.key === activeKey) ?? blocks[0];

  const unitsByKey = useMemo(() => new Map(blocks.map((b) => [b.key, generateUnits(b)])), [blocks]);
  const problemsByKey = useMemo(
    () => new Map(blocks.map((b) => [b.key, validateBlock(b, unitsByKey.get(b.key) ?? [], blocks)])),
    [blocks, unitsByKey],
  );
  const totalUnits = blocks.reduce((s, b) => s + (unitsByKey.get(b.key)?.length ?? 0), 0);
  const blocksWithProblems = blocks.filter((b) => (problemsByKey.get(b.key) ?? []).length > 0);

  // Creation
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, BlockRun>>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showCodes, setShowCodes] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !creating) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, creating]);

  const pickPropertyType = (t: PropertyType) => {
    setPropertyType(t);
    // Only reshape the blocks if the user hasn't started editing them.
    if (!structureTouched) {
      const next = starterBlocks(t);
      setBlocks(next);
      setActiveKey(next[0].key);
    }
  };

  const updateBlock = (b: Block) => {
    setStructureTouched(true);
    setBlocks((all) => all.map((x) => (x.key === b.key ? b : x)));
  };
  const addBlock = (kind: BlockKind) => {
    setStructureTouched(true);
    const b = createBlock(kind, blocks);
    setBlocks((all) => [...all, b]);
    setActiveKey(b.key);
  };
  const copyBlock = (b: Block) => {
    setStructureTouched(true);
    const c = duplicateBlock(b, blocks);
    setBlocks((all) => [...all, c]);
    setActiveKey(c.key);
  };
  const removeBlock = (b: Block) => {
    setStructureTouched(true);
    const rest = blocks.filter((x) => x.key !== b.key);
    setBlocks(rest);
    if (activeKey === b.key) setActiveKey(rest[0]?.key ?? '');
  };

  const goStructure = () => {
    if (!form.name.trim() || !form.address.trim() || !form.city.trim()) {
      setDetailsError('Society name, address and city are required.'); return;
    }
    if (form.pinCode && !/^\d{6}$/.test(form.pinCode)) { setDetailsError('Pin code must be 6 digits.'); return; }
    setDetailsError('');
    setStep('structure');
  };

  const goReview = () => {
    if (blocksWithProblems.length) { setActiveKey(blocksWithProblems[0].key); return; }
    setStep('review');
  };

  const runCreate = async () => {
    setCreating(true); setCreateError('');
    let sid = societyId;
    try {
      if (!sid) {
        const payload = {
          ...form,
          ...(location ? { latitude: location.lat, longitude: location.lng, mapAddress: location.address } : {}),
        };
        const res = await api.post('/superadmin/societies', payload);
        sid = res.data.data.id as string;
        setSocietyId(sid);
        onCreated();
      }
    } catch (err) {
      setCreateError(errorMessage(err, 'Could not create the society. Please try again.'));
      setCreating(false);
      return;
    }

    let failed = false;
    for (const b of blocks) {
      const prev = runs[b.key];
      if (prev?.state === 'done') continue;
      const units = unitsByKey.get(b.key) ?? [];
      setRuns((r) => ({ ...r, [b.key]: { ...prev, state: 'creating', done: 0, total: units.length, error: undefined } }));
      try {
        const result = await createBlockOnServer(sid!, b, units, {
          existingWingId: prev?.wingId,
          onProgress: (done, total) => setRuns((r) => ({ ...r, [b.key]: { ...r[b.key], done, total } })),
          onWing: (wingId, activation, secretaryError) =>
            setRuns((r) => ({ ...r, [b.key]: { ...r[b.key], wingId, activation, secretaryError } })),
        });
        setRuns((r) => ({
          ...r,
          [b.key]: {
            ...r[b.key], state: 'done', wingId: result.wingId,
            // On a resumed block the code was issued by the first attempt.
            result: {
              ...result,
              secretaryActivation: result.secretaryActivation ?? r[b.key]?.activation ?? null,
              secretaryError: result.secretaryError || r[b.key]?.secretaryError || '',
            },
          },
        }));
      } catch (err) {
        failed = true;
        const message = errorMessage(err, 'Something went wrong');
        setRuns((r) => ({ ...r, [b.key]: { ...r[b.key], state: 'error', error: message } }));
      }
    }
    setCreating(false);
    if (!failed) {
      setStep('done');
      setShowCodes(true);
    }
  };

  const codes: CodeEntry[] = blocks.flatMap((b) => {
    const a = runs[b.key]?.result?.secretaryActivation;
    return a ? [{ name: `${b.secretaryName.trim()} (${b.name})`, phone: b.secretaryPhone, activation: a }] : [];
  });
  const createdUnits = Object.values(runs).reduce((s, r) => s + (r.result?.unitsCreated ?? 0), 0);
  const unitIssues = blocks.flatMap((b) => {
    const r = runs[b.key]?.result;
    if (!r) return [];
    const out: string[] = [];
    if (r.secretaryError) out.push(`${b.name}: secretary not added — ${r.secretaryError}`);
    if (r.unitErrors.length) out.push(`${b.name}: ${r.unitErrors.length} unit${r.unitErrors.length > 1 ? 's' : ''} not created (${r.unitErrors[0]})`);
    return out;
  });

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const startedCreating = Object.keys(runs).length > 0;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-3xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-7xl h-full sm:h-[92vh] flex overflow-hidden">
        {/* Side rail */}
        <aside className="hidden lg:flex w-56 flex-shrink-0 bg-hero text-white flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-60" />
          <div className="relative p-6 flex-1 flex flex-col">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
                <Building size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">New society</p>
                <p className="text-[11px] text-white/60">Setup wizard</p>
              </div>
            </div>
            <ol className="mt-10 space-y-1">
              {STEPS.map((s, i) => {
                const done = i < stepIndex;
                const current = i === stepIndex;
                return (
                  <li key={s.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done ? 'bg-sun-400 text-blue-900' : current ? 'bg-white text-blue-800 ring-4 ring-white/20' : 'bg-white/10 text-white/50 ring-1 ring-white/15'
                      }`}>
                        {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                      </span>
                      {i < STEPS.length - 1 && <span className={`w-px flex-1 min-h-6 my-1 ${done ? 'bg-sun-400/70' : 'bg-white/15'}`} />}
                    </div>
                    <div className="pb-5">
                      <p className={`text-sm font-semibold ${current ? 'text-white' : done ? 'text-white/85' : 'text-white/50'}`}>{s.label}</p>
                      <p className="text-[11px] text-white/45">{s.sub}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-auto rounded-2xl bg-white/10 ring-1 ring-white/15 p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">So far</p>
              <p className="text-sm font-semibold mt-1 truncate">{form.name || 'Unnamed society'}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xl font-semibold tabular-nums">{blocks.length}</p>
                  <p className="text-[11px] text-white/55">blocks</p>
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums">{totalUnits.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-white/55">units</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="flex items-center justify-between gap-4 px-5 sm:px-7 py-4 border-b border-gray-100">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 lg:hidden">Step {stepIndex + 1} of {STEPS.length}</p>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 truncate">
                {step === 'details' && 'Tell us about the society'}
                {step === 'structure' && 'Build the structure'}
                {step === 'review' && (startedCreating ? 'Creating your society' : 'Review and create')}
                {step === 'done' && `${form.name} is ready`}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                {step === 'details' && 'Basic details first. You can change them later.'}
                {step === 'structure' && 'Add towers that go up, and houses or plots that spread out. Mix as many as you need.'}
                {step === 'review' && (startedCreating ? 'Keep this window open until every block is finished.' : 'Nothing is saved until you press Create.')}
                {step === 'done' && 'All blocks and units have been created.'}
              </p>
            </div>
            <button onClick={onClose} disabled={creating} className="p-2 -mr-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 disabled:opacity-40" aria-label="Close">
              <X size={20} />
            </button>
          </header>
          <div className="lg:hidden h-1 bg-gray-100">
            <div className="h-full bg-gradient-to-r from-blue-500 to-sun-400 transition-all duration-500" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ── Details ── */}
            {step === 'details' && (
              <div className="p-5 sm:p-7 max-w-3xl space-y-7 animate-fade-up">
                <section className="space-y-4">
                  <Field label="Society name *">
                    <input value={form.name} onChange={set('name')} placeholder="e.g. Swastik Heights" className={`${inputCls} text-base`} autoFocus />
                  </Field>
                  <Field label="Address *">
                    <input value={form.address} onChange={set('address')} placeholder="Street, area, landmark" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="City *">
                      <input value={form.city} onChange={set('city')} placeholder="e.g. Ahmedabad" className={inputCls} />
                    </Field>
                    <Field label="State">
                      <select value={form.state} onChange={set('state')} className={inputCls}>
                        {STATES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Pin code">
                      <input value={form.pinCode} inputMode="numeric" maxLength={6} placeholder="6 digits" className={inputCls}
                        onChange={(e) => setForm((f) => ({ ...f, pinCode: e.target.value.replace(/\D/g, '') }))} />
                    </Field>
                  </div>
                </section>

                <section>
                  <p className="text-[13px] font-medium text-gray-700">Property type</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 mb-3">We&apos;ll suggest a starting structure. You can mix types in the next step.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {(Object.keys(PROPERTY_TYPES) as PropertyType[]).map((t) => {
                      const kind = PROPERTY_ICONS[t];
                      const Icon = t === 'MIXED' ? Sparkles : KIND_ICONS[kind];
                      const on = propertyType === t;
                      return (
                        <button key={t} type="button" onClick={() => pickPropertyType(t)}
                          className={`relative text-left rounded-2xl border p-3.5 transition-all ${
                            on ? 'border-blue-500 bg-blue-50/60 ring-4 ring-blue-500/10' : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                          }`}>
                          {on && <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center"><Check size={12} strokeWidth={3} /></span>}
                          <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t === 'MIXED' ? 'from-sun-400 to-orange-500' : KIND_TINTS[kind]} flex items-center justify-center shadow-sm`}>
                            <Icon size={17} className="text-white" />
                          </span>
                          <p className="text-sm font-semibold text-gray-900 mt-2.5">{PROPERTY_TYPES[t].label}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{PROPERTY_TYPES[t].description}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl ring-1 ring-inset ring-gray-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><MapPin size={16} /></span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Pin on map</p>
                        <p className="text-[11px] text-gray-400">Optional — helps residents and guards find the gate</p>
                      </div>
                    </div>
                    <button type="button" role="switch" aria-checked={showMap} onClick={() => setShowMap((m) => !m)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${showMap ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${showMap ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {showMap && (
                    <div className="mt-4">
                      <MapPicker onLocationSelect={(lat, lng, address) => setLocation({ lat, lng, address })} initialLat={location?.lat} initialLng={location?.lng} />
                    </div>
                  )}
                  {!showMap && location && (
                    <p className="mt-3 text-xs text-blue-800 bg-blue-50 rounded-xl p-3 leading-relaxed">{location.address}</p>
                  )}
                </section>

                {detailsError && <p className="text-sm text-red-600 flex items-center gap-1.5"><TriangleAlert size={15} /> {detailsError}</p>}
              </div>
            )}

            {/* ── Structure ── */}
            {step === 'structure' && (
              <div className="flex flex-col md:flex-row min-h-full animate-fade-up">
                {/* Block list */}
                <div className="md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/60 p-3 md:p-4">
                  <p className="hidden md:block text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-1 mb-2">Blocks · {blocks.length}</p>
                  <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
                    {blocks.map((b) => {
                      const Icon = KIND_ICONS[b.kind];
                      const n = unitsByKey.get(b.key)?.length ?? 0;
                      const bad = (problemsByKey.get(b.key) ?? []).length > 0;
                      const on = b.key === active?.key;
                      return (
                        <div key={b.key} role="button" tabIndex={0} onClick={() => setActiveKey(b.key)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setActiveKey(b.key); }}
                          className={`group flex-shrink-0 w-48 md:w-auto flex items-center gap-2.5 rounded-xl p-2.5 cursor-pointer transition-all ${
                            on ? 'bg-white shadow-md ring-1 ring-blue-200' : 'hover:bg-white/80 ring-1 ring-transparent'
                          }`}>
                          <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${KIND_TINTS[b.kind]} flex items-center justify-center flex-shrink-0`}>
                            <Icon size={15} className="text-white" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-gray-900 truncate">{b.name || 'Untitled'}</p>
                            <p className={`text-[11px] ${bad ? 'text-orange-600' : 'text-gray-400'}`}>
                              {bad ? 'Needs attention' : `${n.toLocaleString('en-IN')} units`}
                            </p>
                          </div>
                          <div className={`flex gap-0.5 ${on ? '' : 'md:opacity-0 md:group-hover:opacity-100'}`}>
                            <button type="button" title="Duplicate" onClick={(e) => { e.stopPropagation(); copyBlock(b); }}
                              className="p-1 rounded-md text-gray-400 hover:text-blue-700 hover:bg-blue-50"><Copy size={13} /></button>
                            {blocks.length > 1 && (
                              <button type="button" title="Remove" onClick={(e) => { e.stopPropagation(); removeBlock(b); }}
                                className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-1 mt-4 mb-2">Add block</p>
                  <div className="grid grid-cols-3 md:grid-cols-1 gap-1.5">
                    {KIND_ORDER.map((k) => {
                      const Icon = KIND_ICONS[k];
                      return (
                        <button key={k} type="button" onClick={() => addBlock(k)}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-600 bg-white ring-1 ring-gray-200 hover:ring-blue-300 hover:text-blue-700">
                          <Plus size={11} /> <Icon size={12} className="flex-shrink-0" /> <span className="truncate">{BLOCK_KINDS[k].short}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 min-w-0 p-5 sm:p-6">
                  {active ? (
                    <BlockEditor key={active.key} block={active} allBlocks={blocks} onChange={updateBlock} />
                  ) : (
                    <div className="text-center py-20">
                      <p className="text-sm text-gray-500">Add a block from the list to begin.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Review / progress ── */}
            {step === 'review' && (
              <div className="p-5 sm:p-7 max-w-4xl space-y-5 animate-fade-up">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Society', value: form.name },
                    { label: 'City', value: `${form.city}, ${form.state}` },
                    { label: 'Blocks', value: blocks.length },
                    { label: 'Units', value: totalUnits.toLocaleString('en-IN') },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl bg-gray-50 ring-1 ring-inset ring-gray-100 p-4 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
                      <p className="text-base font-semibold text-gray-900 mt-1 truncate">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl ring-1 ring-gray-200/70 divide-y divide-gray-100 overflow-hidden">
                  {blocks.map((b) => {
                    const Icon = KIND_ICONS[b.kind];
                    const units = unitsByKey.get(b.key) ?? [];
                    const run = runs[b.key];
                    const pct = run && run.total ? Math.round((run.done / run.total) * 100) : 0;
                    return (
                      <div key={b.key} className="p-4 flex items-center gap-4">
                        <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${KIND_TINTS[b.kind]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <Icon size={18} className="text-white" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{BLOCK_KINDS[b.kind].short}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{summarize(b, units)}</p>
                          {b.secretaryName && <p className="text-[11px] text-gray-400 mt-0.5">Secretary: {b.secretaryName} · {b.secretaryPhone}</p>}
                          {run?.state === 'creating' && (
                            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
                            </div>
                          )}
                          {run?.state === 'error' && <p className="text-xs text-red-600 mt-1">{run.error}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {!run && <p className="text-sm font-semibold tabular-nums text-gray-900">{plural(units.length, 'unit')}</p>}
                          {run?.state === 'pending' && <p className="text-xs text-gray-400">Waiting</p>}
                          {run?.state === 'creating' && <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-700"><LoaderCircle size={14} className="animate-spin" /> {run.done}/{run.total}</p>}
                          {run?.state === 'done' && <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CircleCheck size={15} /> Created</p>}
                          {run?.state === 'error' && <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600"><TriangleAlert size={14} /> Failed</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {createError && <p className="text-sm text-red-600 flex items-center gap-1.5"><TriangleAlert size={15} /> {createError}</p>}
                {!creating && Object.values(runs).some((r) => r.state === 'error') && (
                  <div className="rounded-2xl bg-orange-50 ring-1 ring-inset ring-orange-200 p-4 text-sm text-orange-800">
                    Some blocks could not be finished. The society and finished blocks are saved — press <strong>Retry</strong> to
                    continue only the remaining ones.
                  </div>
                )}
                {!startedCreating && (
                  <p className="text-xs text-gray-500">
                    The society starts on a 30-day trial. Secretaries get a one-time activation code you can share right after.
                  </p>
                )}
              </div>
            )}

            {/* ── Done ── */}
            {step === 'done' && (
              <div className="p-5 sm:p-10 max-w-2xl mx-auto text-center animate-fade-up">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-3xl bg-emerald-400/30 animate-ping [animation-iteration-count:2]" />
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center shadow-xl shadow-emerald-600/25">
                    <Check size={38} strokeWidth={2.6} className="text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-gray-900 mt-6">{form.name} is live 🎉</h3>
                <p className="text-sm text-gray-500 mt-1.5">
                  {plural(blocks.length, 'block')} and {plural(createdUnits, 'unit')} created. 30-day trial started.
                </p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {blocks.map((b) => {
                    const Icon = KIND_ICONS[b.kind];
                    const r = runs[b.key]?.result;
                    return (
                      <div key={b.key} className="flex items-center gap-3 rounded-xl bg-gray-50 ring-1 ring-inset ring-gray-100 px-3 py-2.5">
                        <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${KIND_TINTS[b.kind]} flex items-center justify-center`}><Icon size={14} className="text-white" /></span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                          <p className="text-[11px] text-gray-500">{plural(r?.unitsCreated ?? 0, 'unit')}{b.secretaryName ? ` · ${b.secretaryName}` : ''}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {unitIssues.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-orange-50 ring-1 ring-inset ring-orange-200 p-4 text-left space-y-1">
                    {unitIssues.map((m) => <p key={m} className="text-xs text-orange-800">{m}</p>)}
                  </div>
                )}
                {codes.length > 0 && (
                  <button onClick={() => setShowCodes(true)}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl">
                    <KeyRound size={15} /> Secretary activation codes ({codes.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-t border-gray-100 bg-white">
            {step === 'details' && (
              <>
                <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800">Cancel</button>
                <button onClick={goStructure} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">
                  Next: Structure <ArrowRight size={16} />
                </button>
              </>
            )}
            {step === 'structure' && (
              <>
                <button onClick={() => setStep('details')} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800">
                  <ArrowLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <p className="hidden sm:block text-xs text-gray-500">
                    <span className="font-semibold text-gray-900 tabular-nums">{totalUnits.toLocaleString('en-IN')}</span> units in {plural(blocks.length, 'block')}
                  </p>
                  <button onClick={goReview} disabled={!blocks.length}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {blocksWithProblems.length ? `Fix ${blocksWithProblems.length} block${blocksWithProblems.length > 1 ? 's' : ''}` : 'Review'} <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
            {step === 'review' && (
              <>
                <button onClick={() => setStep('structure')} disabled={creating || !!societyId}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-0">
                  <ArrowLeft size={16} /> Back
                </button>
                <button onClick={runCreate} disabled={creating}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                  {creating ? <><LoaderCircle size={16} className="animate-spin" /> Creating…</>
                    : startedCreating ? <><RotateCcw size={15} /> Retry</>
                    : <><Sparkles size={15} /> Create society</>}
                </button>
              </>
            )}
            {step === 'done' && societyId && (
              <>
                <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800">Close</button>
                <button onClick={() => { onClose(); router.push(`/dashboard/societies/${societyId}`); }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">
                  Open society <ArrowRight size={16} />
                </button>
              </>
            )}
          </footer>
        </div>
      </div>
      {showCodes && codes.length > 0 && (
        <ActivationCodeModal title="Share with the Secretaries" entries={codes} onClose={() => setShowCodes(false)} />
      )}
    </div>
  );
}
