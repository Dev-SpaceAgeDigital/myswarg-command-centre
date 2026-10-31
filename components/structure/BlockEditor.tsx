'use client';
import { useMemo, useState } from 'react';
import {
  Building2, House, Rows3, Fence, LandPlot, ListOrdered, Minus, Plus,
  ArrowUpFromLine, ArrowRightFromLine, UserPlus, TriangleAlert, ChevronDown,
} from 'lucide-react';
import {
  Block, BlockKind, BLOCK_KINDS, KIND_ORDER, createBlock, generateUnits, validateBlock, prefixFromName, summarize, plural,
} from '@/lib/property-layout';
import StructurePreview from './StructurePreview';

export const KIND_ICONS: Record<BlockKind, React.ElementType> = {
  TOWER: Building2,
  BUNGALOW: House,
  ROW_HOUSE: Rows3,
  TENEMENT: Fence,
  PLOT: LandPlot,
  CUSTOM: ListOrdered,
};

export const KIND_TINTS: Record<BlockKind, string> = {
  TOWER: 'from-blue-500 to-indigo-600',
  BUNGALOW: 'from-sun-400 to-sun-600',
  ROW_HOUSE: 'from-orange-400 to-rose-500',
  TENEMENT: 'from-violet-500 to-fuchsia-600',
  PLOT: 'from-emerald-400 to-emerald-600',
  CUSTOM: 'from-gray-500 to-gray-700',
};

// ─── Small controls ──────────────────────────────────────────────────────────

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-gray-700">{label}</span>
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500';

function Stepper({ value, onChange, min = 0, max = 999 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? Math.round(n) : min));
  return (
    <div className="flex items-stretch rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden h-[42px]">
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="Decrease"
        className="px-3 text-gray-500 hover:bg-gray-50 hover:text-blue-700 disabled:opacity-40">
        <Minus size={14} />
      </button>
      <input
        type="number" inputMode="numeric" value={value} min={min} max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-full min-w-0 text-center text-sm font-semibold tabular-nums text-gray-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Increase"
        className="px-3 text-gray-500 hover:bg-gray-50 hover:text-blue-700 disabled:opacity-40">
        <Plus size={14} />
      </button>
    </div>
  );
}

function Segmented<T extends string | number>({
  value, options, onChange,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
      {options.map((o) => (
        <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
          className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            value === o.value ? 'bg-white text-blue-800 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-700'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function KindPicker({ value, onChange, compact }: { value?: BlockKind; onChange: (k: BlockKind) => void; compact?: boolean }) {
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-3 @xl:grid-cols-6 @3xl:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {KIND_ORDER.map((k) => {
        const Icon = KIND_ICONS[k];
        const meta = BLOCK_KINDS[k];
        const active = value === k;
        return (
          <button key={k} type="button" onClick={() => onChange(k)}
            className={`group relative text-left rounded-xl border p-2.5 transition-all ${
              active ? 'border-blue-500 bg-blue-50/70 ring-4 ring-blue-500/10' : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
            } ${compact ? 'flex flex-col items-center text-center gap-1.5' : 'flex items-start gap-2.5'}`}>
            <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${KIND_TINTS[k]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <Icon size={15} className="text-white" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-gray-900 leading-tight">{compact ? meta.short : meta.label}</span>
              {!compact && <span className="block text-[11px] text-gray-400 mt-0.5 leading-snug">{meta.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────

export default function BlockEditor({
  block, allBlocks, onChange, showSecretary = true,
}: { block: Block; allBlocks: Block[]; onChange: (b: Block) => void; showSecretary?: boolean }) {
  const units = useMemo(() => generateUnits(block), [block]);
  const problems = useMemo(() => validateBlock(block, units, allBlocks), [block, units, allBlocks]);
  const meta = BLOCK_KINDS[block.kind];
  const [moreOpen, setMoreOpen] = useState(false);

  const set = (patch: Partial<Block>) => onChange({ ...block, ...patch });
  const setTower = (patch: Partial<Block['tower']>) => onChange({ ...block, tower: { ...block.tower, ...patch } });
  const setH = (patch: Partial<Block['horizontal']>) => onChange({ ...block, horizontal: { ...block.horizontal, ...patch } });

  const changeKind = (kind: BlockKind) => {
    if (kind === block.kind) return;
    const fresh = createBlock(kind, allBlocks.filter((b) => b.key !== block.key));
    const nameIsDefault = /^(Wing [A-Z]+|Bungalows|Row Houses|Tenements|Plots|Block)( \d+)?$/.test(block.name.trim());
    onChange({
      ...block,
      kind,
      name: nameIsDefault ? fresh.name : block.name,
      prefix: block.prefixTouched ? block.prefix : nameIsDefault ? fresh.prefix : prefixFromName(block.name),
      horizontal: { ...block.horizontal, levels: fresh.horizontal.levels },
    });
  };

  const sample = units.slice(0, 3).map((u) => u.number).join(', ') + (units.length > 3 ? ` … ${units[units.length - 1].number}` : '');

  return (
    <div className="@container">
    <div className="grid grid-cols-1 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5">
      {/* Settings */}
      <div className="space-y-5">
        <KindPicker value={block.kind} onChange={changeKind} compact />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Block name" hint="Shown to residents">
            <input value={block.name} className={inputCls} placeholder={meta.defaultName}
              onChange={(e) => {
                const name = e.target.value;
                set({ name, prefix: block.prefixTouched ? block.prefix : prefixFromName(name) });
              }} />
          </Field>
          <Field label="Unit prefix" hint="Optional, e.g. A → A-101">
            <input value={block.prefix} className={inputCls} placeholder="none" maxLength={8}
              onChange={(e) => set({ prefix: e.target.value.replace(/\s+/g, ''), prefixTouched: true })} />
          </Field>
        </div>

        {meta.orientation === 'VERTICAL' && (
          <div className="space-y-4 rounded-2xl bg-gray-50/80 ring-1 ring-inset ring-gray-100 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              <ArrowUpFromLine size={13} /> Vertical layout
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Floors above ground">
                <Stepper value={block.tower.floors} min={1} max={120} onChange={(floors) => setTower({ floors })} />
              </Field>
              <Field label="Flats per floor">
                <Stepper value={block.tower.unitsPerFloor} min={1} max={50} onChange={(unitsPerFloor) => setTower({ unitsPerFloor })} />
              </Field>
            </div>
            <Field label="Ground floor">
              <Segmented value={block.tower.groundFloor} onChange={(groundFloor) => setTower({ groundFloor })}
                options={[{ value: 'PARKING', label: 'Parking' }, { value: 'FLATS', label: 'Flats' }, { value: 'SHOPS', label: 'Shops' }]} />
            </Field>
            {block.tower.groundFloor !== 'PARKING' && (
              <Field label={block.tower.groundFloor === 'SHOPS' ? 'Shops on ground floor' : 'Flats on ground floor'}>
                <Stepper value={block.tower.groundUnits} min={1} max={50} onChange={(groundUnits) => setTower({ groundUnits })} />
              </Field>
            )}
            <Field label="Numbering">
              <Segmented value={block.tower.numbering} onChange={(numbering) => setTower({ numbering })}
                options={[{ value: 'FLOOR_UNIT', label: 'By floor · 101, 102' }, { value: 'SEQUENTIAL', label: 'Running · 01, 02' }]} />
            </Field>
            <button type="button" onClick={() => setMoreOpen((o) => !o)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800">
              <ChevronDown size={14} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} /> More options
            </button>
            {moreOpen && (
              <div className="space-y-3 animate-fade-in">
                <Field label="Skip floor numbers" hint="e.g. 13 — numbering jumps from 12 to 14">
                  <input value={block.tower.skipFloors} className={inputCls} placeholder="none"
                    onChange={(e) => setTower({ skipFloors: e.target.value })} />
                </Field>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Penthouse or refuge floor with a different count? Use the <span className="font-semibold">− / +</span> next
                  to any floor in the preview.
                </p>
                {Object.keys(block.tower.floorOverrides).length > 0 && (
                  <button type="button" onClick={() => setTower({ floorOverrides: {} })}
                    className="text-xs font-semibold text-sun-700 hover:underline">
                    Reset {Object.keys(block.tower.floorOverrides).length} custom floor{Object.keys(block.tower.floorOverrides).length > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {meta.orientation === 'HORIZONTAL' && (
          <div className="space-y-4 rounded-2xl bg-gray-50/80 ring-1 ring-inset ring-gray-100 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              <ArrowRightFromLine size={13} /> Horizontal layout
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lanes / rows">
                <Stepper value={block.horizontal.lanes} min={1} max={60} onChange={(lanes) => setH({ lanes })} />
              </Field>
              <Field label={`${meta.unitWord[0].toUpperCase()}${meta.unitWord.slice(1)}s per lane`}>
                <Stepper value={block.horizontal.unitsPerLane} min={1} max={200} onChange={(unitsPerLane) => setH({ unitsPerLane })} />
              </Field>
            </div>
            {block.kind !== 'PLOT' && (
              <Field label="Each house is" hint="Choose G+1 if ground and first floor are separate homes">
                <Segmented value={block.horizontal.levels} onChange={(levels) => setH({ levels })}
                  options={[{ value: 1, label: 'One home' }, { value: 2, label: 'G+1 · 2 homes' }, { value: 3, label: 'G+2 · 3 homes' }]} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Numbering">
                <Segmented value={block.horizontal.numbering} onChange={(numbering) => setH({ numbering })}
                  options={[{ value: 'CONTINUOUS', label: '1, 2, 3…' }, { value: 'PER_LANE', label: 'A01, B01' }]} />
              </Field>
              <Field label="Start at">
                <Stepper value={block.horizontal.startAt} min={0} max={9999} onChange={(startAt) => setH({ startAt })} />
              </Field>
            </div>
            {block.horizontal.lanes > 1 && (
              <Field label="Lane names">
                <Segmented value={block.horizontal.laneLabel} onChange={(laneLabel) => setH({ laneLabel })}
                  options={[{ value: 'LETTER', label: 'A, B, C' }, { value: 'NUMBER', label: '1, 2, 3' }]} />
              </Field>
            )}
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Lanes of different lengths? Use the <span className="font-semibold">− / +</span> next to any lane in the preview.
            </p>
          </div>
        )}

        {meta.orientation === 'LIST' && (
          <Field label="Unit numbers" hint='One per line or comma-separated. Add a floor with "101 @ 1".'>
            <textarea value={block.customText} rows={8} className={`${inputCls} font-mono text-[13px] resize-y`}
              placeholder={'101 @ 1\n102 @ 1\nShop-1\nVilla 7'}
              onChange={(e) => set({ customText: e.target.value })} />
          </Field>
        )}

        {showSecretary && (
          <div className="rounded-2xl ring-1 ring-inset ring-gray-100 p-4 space-y-3">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700">
              <UserPlus size={14} className="text-blue-600" /> Secretary <span className="text-gray-400 font-normal">· optional</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input value={block.secretaryName} className={inputCls} placeholder="Full name"
                onChange={(e) => set({ secretaryName: e.target.value })} />
              <input value={block.secretaryPhone} className={inputCls} placeholder="10-digit mobile" inputMode="numeric" maxLength={10}
                onChange={(e) => set({ secretaryPhone: e.target.value.replace(/\D/g, '') })} />
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="rounded-2xl bg-gradient-to-b from-mint-50 to-white ring-1 ring-inset ring-blue-100 flex flex-col min-h-[320px]">
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Live preview</p>
            <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{block.name || meta.defaultName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{summarize(block, units)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-blue-700">{units.length.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-gray-400">{units.length === 1 ? 'unit' : 'units'}</p>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-4 py-4 max-h-[460px]">
          <StructurePreview block={block} units={units} onChange={onChange} />
        </div>
        <div className="border-t border-blue-100/70 px-4 py-3 space-y-1.5">
          {units.length > 0 && (
            <p className="text-[11px] text-gray-500 truncate">
              <span className="font-semibold text-gray-600">Numbers:</span> <span className="font-mono">{sample}</span>
            </p>
          )}
          {problems.map((p) => (
            <p key={p} className="flex items-start gap-1.5 text-xs text-orange-700">
              <TriangleAlert size={13} className="mt-px flex-shrink-0" /> {p}
            </p>
          ))}
          {!problems.length && units.length > 0 && (
            <p className="text-xs text-emerald-700 font-medium">Ready · {plural(units.length, 'unit')} will be created</p>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
