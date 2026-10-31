'use client';
import { Minus, Plus, RotateCcw, Car, Store } from 'lucide-react';
import {
  Block, Unit, BLOCK_KINDS, laneName, towerFloors, unitsOnFloor, unitsInLane,
} from '@/lib/property-layout';

/** The unit code without the block prefix, so cells stay small. */
const shortCode = (u: Unit, prefix: string) => {
  const p = prefix.trim();
  return p && u.number.startsWith(`${p}-`) ? u.number.slice(p.length + 1) : u.number;
};

// Very tall towers show their top and bottom floors with the middle folded.
const FOLD_AFTER = 18;

function StepButtons({
  value, onChange, overridden, onReset, min = 0, max = 99,
}: { value: number; onChange: (n: number) => void; overridden: boolean; onReset: () => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-within:opacity-100 transition-opacity">
      <button type="button" aria-label="One less" disabled={value <= min} onClick={() => onChange(value - 1)}
        className="w-6 h-6 rounded-md bg-white ring-1 ring-gray-200 text-gray-500 hover:text-blue-700 hover:ring-blue-300 flex items-center justify-center disabled:opacity-40">
        <Minus size={12} />
      </button>
      <button type="button" aria-label="One more" disabled={value >= max} onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded-md bg-white ring-1 ring-gray-200 text-gray-500 hover:text-blue-700 hover:ring-blue-300 flex items-center justify-center disabled:opacity-40">
        <Plus size={12} />
      </button>
      {overridden && (
        <button type="button" aria-label="Reset" onClick={onReset} title="Back to default"
          className="w-6 h-6 rounded-md text-sun-700 hover:bg-sun-50 flex items-center justify-center">
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
}

function TowerPreview({ block, units, onChange }: { block: Block; units: Unit[]; onChange?: (b: Block) => void }) {
  const cfg = block.tower;
  const floors = towerFloors(cfg).slice().reverse();
  const byFloor = new Map<number, Unit[]>();
  units.forEach((u) => byFloor.set(u.floor, [...(byFloor.get(u.floor) ?? []), u]));

  const folded = floors.length > FOLD_AFTER;
  const shown: (number | 'fold')[] = folded
    ? [...floors.slice(0, 8), 'fold', ...floors.slice(-8)]
    : floors;

  const setOverride = (floor: number, n: number | null) => {
    if (!onChange) return;
    const next = { ...cfg.floorOverrides };
    if (n === null || n === cfg.unitsPerFloor) delete next[floor]; else next[floor] = n;
    onChange({ ...block, tower: { ...cfg, floorOverrides: next } });
  };

  const ground = byFloor.get(0) ?? [];

  return (
    <div className="flex flex-col items-center min-w-fit mx-auto">
      {/* Roof */}
      <div className="relative w-full flex justify-center">
        <div className="h-3 w-[calc(100%-24px)] rounded-t-lg bg-gradient-to-b from-blue-700 to-blue-600" />
      </div>
      <div className="w-full rounded-b-sm bg-gradient-to-b from-white to-blue-50/50 ring-1 ring-blue-200/70 px-2 py-2 space-y-1">
        {shown.map((f) => {
          if (f === 'fold') {
            const hidden = floors.length - 16;
            return (
              <div key="fold" className="flex items-center gap-2 py-1">
                <span className="w-10" />
                <div className="flex-1 border-t border-dashed border-blue-300" />
                <span className="text-[11px] font-medium text-blue-700 whitespace-nowrap">{hidden} more floors</span>
                <div className="flex-1 border-t border-dashed border-blue-300" />
              </div>
            );
          }
          const list = byFloor.get(f) ?? [];
          const count = unitsOnFloor(cfg, f);
          const overridden = cfg.floorOverrides[f] !== undefined;
          return (
            <div key={f} className="group/row flex items-center gap-2">
              <span className={`w-10 text-right text-[11px] font-semibold tabular-nums ${overridden ? 'text-sun-700' : 'text-gray-400'}`}>
                F{f}
              </span>
              <div className="flex gap-1 flex-1">
                {list.length === 0 ? (
                  <div className="h-7 flex-1 rounded-md border border-dashed border-gray-300 text-[10px] text-gray-400 flex items-center justify-center">no homes</div>
                ) : list.map((u) => (
                  <div key={u.number} title={u.number}
                    className={`h-7 min-w-[40px] px-1.5 flex-1 rounded-md flex items-center justify-center text-[10px] font-semibold tabular-nums ring-1 ring-inset ${
                      overridden ? 'bg-sun-50 text-sun-800 ring-sun-200' : 'bg-white text-blue-800 ring-blue-200'
                    }`}>
                    {shortCode(u, block.prefix)}
                  </div>
                ))}
              </div>
              {onChange && (
                <StepButtons value={count} overridden={overridden}
                  onChange={(n) => setOverride(f, n)} onReset={() => setOverride(f, null)} />
              )}
            </div>
          );
        })}

        {/* Ground floor */}
        <div className="flex items-center gap-2 pt-1 mt-1 border-t border-blue-200/70">
          <span className="w-10 text-right text-[11px] font-semibold text-gray-400">G</span>
          <div className="flex gap-1 flex-1">
            {cfg.groundFloor === 'PARKING' ? (
              <div className="h-7 flex-1 rounded-md bg-[repeating-linear-gradient(135deg,var(--color-gray-100)_0_6px,var(--color-gray-200)_6px_12px)] text-[10px] font-semibold text-gray-500 flex items-center justify-center gap-1">
                <Car size={12} /> Stilt parking
              </div>
            ) : ground.map((u) => (
              <div key={u.number} title={u.number}
                className={`h-7 min-w-[40px] px-1.5 flex-1 rounded-md flex items-center justify-center gap-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                  u.tag === 'SHOP' ? 'bg-orange-50 text-orange-700 ring-orange-200' : 'bg-white text-blue-800 ring-blue-200'
                }`}>
                {u.tag === 'SHOP' && <Store size={10} />}{shortCode(u, block.prefix)}
              </div>
            ))}
          </div>
          {onChange && <span className="w-[52px]" />}
        </div>
      </div>
      <div className="h-1.5 w-[calc(100%+24px)] rounded-full bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
    </div>
  );
}

function House({ unit, levels, prefix, plot, units }: { unit: Unit; levels: number; prefix: string; plot: boolean; units: Unit[] }) {
  if (plot) {
    return (
      <div title={unit.number}
        className="w-12 h-12 rounded-md border-2 border-dashed border-emerald-400/70 bg-emerald-50/60 flex items-center justify-center text-[10px] font-semibold text-emerald-800 tabular-nums">
        {shortCode(unit, prefix)}
      </div>
    );
  }
  const stack = units.slice().reverse();
  const label = shortCode(unit, prefix).replace(/-G$/, '');
  return (
    <div className="flex flex-col items-center w-12" title={units.map((u) => u.number).join(', ')}>
      <div className="w-12 h-3.5 bg-gradient-to-b from-sun-500 to-sun-600 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
      <div className="w-10 rounded-b-sm bg-white ring-1 ring-inset ring-blue-200 overflow-hidden">
        {levels > 1 ? stack.map((u, i) => (
          <div key={u.number} className={`h-4 flex items-center justify-center text-[8px] font-semibold text-blue-700 ${i < stack.length - 1 ? 'border-b border-blue-100' : ''}`}>
            {u.level === 0 ? 'G' : `F${u.level}`}
          </div>
        )) : <div className="h-6" />}
      </div>
      <span className="mt-0.5 text-[10px] font-semibold text-gray-600 tabular-nums">{label}</span>
    </div>
  );
}

function HorizontalPreview({ block, units, onChange }: { block: Block; units: Unit[]; onChange?: (b: Block) => void }) {
  const cfg = block.horizontal;
  const plot = block.kind === 'PLOT';

  const setOverride = (lane: number, n: number | null) => {
    if (!onChange) return;
    const next = { ...cfg.laneOverrides };
    if (n === null || n === cfg.unitsPerLane) delete next[lane]; else next[lane] = n;
    onChange({ ...block, horizontal: { ...cfg, laneOverrides: next } });
  };

  return (
    <div className="space-y-0">
      {Array.from({ length: cfg.lanes }, (_, lane) => {
        const inLane = units.filter((u) => u.row === lane);
        const positions = new Map<number, Unit[]>();
        inLane.forEach((u) => positions.set(u.col, [...(positions.get(u.col) ?? []), u]));
        const count = unitsInLane(cfg, lane);
        const overridden = cfg.laneOverrides[lane] !== undefined;
        return (
          <div key={lane}>
            <div className="group/row flex items-start gap-3 py-2">
              <div className="w-14 flex-shrink-0 pt-3">
                <p className={`text-[11px] font-semibold ${overridden ? 'text-sun-700' : 'text-gray-500'}`}>
                  {cfg.lanes > 1 ? `Lane ${laneName(lane, cfg.laneLabel)}` : 'Row'}
                </p>
                <p className="text-[10px] text-gray-400 tabular-nums">{count} {plot ? 'plots' : 'homes'}</p>
              </div>
              <div className="flex flex-wrap gap-x-1.5 gap-y-2 flex-1">
                {count === 0 && <div className="h-12 flex-1 rounded-md border border-dashed border-gray-300 text-[10px] text-gray-400 flex items-center justify-center">empty lane</div>}
                {Array.from(positions.entries()).map(([col, list]) => (
                  <House key={col} unit={list[0]} units={list} levels={cfg.levels} prefix={block.prefix} plot={plot} />
                ))}
              </div>
              {onChange && (
                <div className="pt-3">
                  <StepButtons value={count} overridden={overridden} max={200}
                    onChange={(n) => setOverride(lane, n)} onReset={() => setOverride(lane, null)} />
                </div>
              )}
            </div>
            {lane < cfg.lanes - 1 && (
              <div className="ml-[68px] h-3 rounded-full bg-gray-200/80 flex items-center px-2">
                <div className="w-full border-t-2 border-dashed border-white" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListPreview({ units }: { units: Unit[] }) {
  if (!units.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Type unit numbers on the left to see them here.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {units.slice(0, 400).map((u, i) => (
        <span key={`${u.number}-${i}`} className="text-[11px] font-semibold tabular-nums bg-white text-blue-800 ring-1 ring-inset ring-blue-200 rounded-md px-2 py-1">
          {u.number}
          {u.floor > 0 && <span className="text-gray-400 font-normal"> · F{u.floor}</span>}
        </span>
      ))}
      {units.length > 400 && <span className="text-xs text-gray-400 px-2 py-1">+{units.length - 400} more</span>}
    </div>
  );
}

export default function StructurePreview({
  block, units, onChange,
}: { block: Block; units: Unit[]; onChange?: (b: Block) => void }) {
  const o = BLOCK_KINDS[block.kind].orientation;
  if (o === 'VERTICAL') return <TowerPreview block={block} units={units} onChange={onChange} />;
  if (o === 'HORIZONTAL') return <HorizontalPreview block={block} units={units} onChange={onChange} />;
  return <ListPreview units={units} />;
}
