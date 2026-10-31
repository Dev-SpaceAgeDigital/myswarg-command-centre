/**
 * Property structure engine for the society setup wizard.
 *
 * A society is made of blocks (stored as "wings" by the API). Each block can be
 * laid out vertically (a tower: floors stacked, units per floor) or
 * horizontally (bungalows, row houses, tenements, plots: units side by side in
 * lanes), or be a hand-typed list. This file turns a block's settings into the
 * exact list of units the API should create, so the preview and the result
 * always match.
 */

export type BlockKind = 'TOWER' | 'BUNGALOW' | 'ROW_HOUSE' | 'TENEMENT' | 'PLOT' | 'CUSTOM';
export type Orientation = 'VERTICAL' | 'HORIZONTAL' | 'LIST';

export type GroundFloor = 'FLATS' | 'SHOPS' | 'PARKING';
export type TowerNumbering = 'FLOOR_UNIT' | 'SEQUENTIAL';
export type LaneNumbering = 'CONTINUOUS' | 'PER_LANE';
export type LaneLabel = 'LETTER' | 'NUMBER';

export interface TowerConfig {
  floors: number;           // residential floors above ground
  unitsPerFloor: number;
  groundFloor: GroundFloor;
  groundUnits: number;      // used when groundFloor is FLATS or SHOPS
  numbering: TowerNumbering;
  skipFloors: string;       // e.g. "13" or "4, 13"
  floorOverrides: Record<number, number>; // floor → units on that floor
}

export interface HorizontalConfig {
  lanes: number;
  unitsPerLane: number;
  laneLabel: LaneLabel;
  numbering: LaneNumbering;
  startAt: number;
  levels: number;           // 1 = whole house is one home; 2+ = each storey is a separate home
  laneOverrides: Record<number, number>; // lane index → units in that lane
}

export interface Block {
  key: string;
  kind: BlockKind;
  name: string;
  prefix: string;
  prefixTouched: boolean;
  tower: TowerConfig;
  horizontal: HorizontalConfig;
  customText: string;
  secretaryName: string;
  secretaryPhone: string;
}

export interface Unit {
  number: string;
  floor: number;
  /** Position used by the preview: row (floor or lane) and column. */
  row: number;
  col: number;
  level?: number;
  tag?: 'SHOP';
}

export const MAX_UNIT_LENGTH = 20;
export const MAX_FLOOR = 200;

export const BLOCK_KINDS: Record<BlockKind, {
  label: string;
  short: string;
  description: string;
  orientation: Orientation;
  unitWord: string;
  defaultName: string;
  defaultPrefix: string;
}> = {
  TOWER: {
    label: 'Tower / Wing', short: 'Tower', orientation: 'VERTICAL', unitWord: 'flat',
    description: 'Apartments stacked floor by floor',
    defaultName: 'Wing A', defaultPrefix: 'A',
  },
  BUNGALOW: {
    label: 'Bungalows / Villas', short: 'Bungalows', orientation: 'HORIZONTAL', unitWord: 'bungalow',
    description: 'Independent houses along lanes',
    defaultName: 'Bungalows', defaultPrefix: 'B',
  },
  ROW_HOUSE: {
    label: 'Row Houses', short: 'Row houses', orientation: 'HORIZONTAL', unitWord: 'house',
    description: 'Attached houses in rows',
    defaultName: 'Row Houses', defaultPrefix: 'R',
  },
  TENEMENT: {
    label: 'Tenements', short: 'Tenements', orientation: 'HORIZONTAL', unitWord: 'tenement',
    description: 'Compact homes, G or G+1, in rows',
    defaultName: 'Tenements', defaultPrefix: 'T',
  },
  PLOT: {
    label: 'Plots', short: 'Plots', orientation: 'HORIZONTAL', unitWord: 'plot',
    description: 'Open or self-built plots',
    defaultName: 'Plots', defaultPrefix: 'P',
  },
  CUSTOM: {
    label: 'Custom List', short: 'Custom', orientation: 'LIST', unitWord: 'unit',
    description: 'Type or paste any unit numbers',
    defaultName: 'Block', defaultPrefix: '',
  },
};

export const KIND_ORDER: BlockKind[] = ['TOWER', 'BUNGALOW', 'ROW_HOUSE', 'TENEMENT', 'PLOT', 'CUSTOM'];

/** What kind of property the society is, used to suggest its first blocks. */
export type PropertyType = 'APARTMENTS' | 'BUNGALOWS' | 'ROW_HOUSES' | 'TENEMENTS' | 'PLOTS' | 'MIXED';

export const PROPERTY_TYPES: Record<PropertyType, { label: string; description: string; starter: BlockKind[] }> = {
  APARTMENTS: { label: 'Apartments', description: 'Towers and wings with floors', starter: ['TOWER', 'TOWER'] },
  BUNGALOWS: { label: 'Bungalows & Villas', description: 'Independent houses in lanes', starter: ['BUNGALOW'] },
  ROW_HOUSES: { label: 'Row Houses', description: 'Attached houses in rows', starter: ['ROW_HOUSE'] },
  TENEMENTS: { label: 'Tenements', description: 'Compact G / G+1 homes', starter: ['TENEMENT'] },
  PLOTS: { label: 'Plotted Scheme', description: 'Plots and self-built homes', starter: ['PLOT'] },
  MIXED: { label: 'Mixed Township', description: 'Towers plus houses', starter: ['TOWER', 'BUNGALOW'] },
};

let keySeq = 0;
const newKey = () => `b${Date.now().toString(36)}${(keySeq++).toString(36)}`;

const letter = (i: number) => {
  let s = '';
  let n = i;
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
};

export function createBlock(kind: BlockKind, existing: Block[] = []): Block {
  const meta = BLOCK_KINDS[kind];
  const sameKind = existing.filter((b) => b.kind === kind).length;
  let name = meta.defaultName;
  let prefix = meta.defaultPrefix;
  if (kind === 'TOWER') {
    name = `Wing ${letter(sameKind)}`;
    prefix = letter(sameKind);
  } else if (sameKind > 0) {
    name = `${meta.defaultName} ${sameKind + 1}`;
    prefix = `${meta.defaultPrefix}${sameKind + 1}`;
  }
  return {
    key: newKey(),
    kind,
    name,
    prefix,
    prefixTouched: false,
    tower: {
      floors: 7, unitsPerFloor: 4, groundFloor: 'PARKING', groundUnits: 4,
      numbering: 'FLOOR_UNIT', skipFloors: '', floorOverrides: {},
    },
    horizontal: {
      lanes: kind === 'PLOT' ? 2 : kind === 'BUNGALOW' ? 2 : 3,
      unitsPerLane: kind === 'BUNGALOW' ? 8 : 10,
      laneLabel: 'LETTER',
      numbering: 'CONTINUOUS',
      startAt: 1,
      levels: kind === 'TENEMENT' ? 2 : 1,
      laneOverrides: {},
    },
    customText: '',
    secretaryName: '',
    secretaryPhone: '',
  };
}

export function duplicateBlock(block: Block, existing: Block[]): Block {
  const fresh = createBlock(block.kind, existing);
  return {
    ...block,
    key: fresh.key,
    name: fresh.name,
    prefix: block.prefixTouched ? `${block.prefix}${existing.length + 1}` : fresh.prefix,
    tower: { ...block.tower, floorOverrides: { ...block.tower.floorOverrides } },
    horizontal: { ...block.horizontal, laneOverrides: { ...block.horizontal.laneOverrides } },
    secretaryName: '',
    secretaryPhone: '',
  };
}

/** A short code from a block name: "Wing A" → "A", "Tower 3" → "3", "Rosewood" → "ROSE". */
export function prefixFromName(name: string): string {
  const words = name.trim().split(/[\s\-_/]+/).filter(Boolean);
  if (!words.length) return '';
  const generic = /^(wing|tower|block|building|bldg|phase|sector)$/i;
  if (words.length > 1 && generic.test(words[0])) return words.slice(1).join('').toUpperCase().slice(0, 4);
  if (words.length === 1) return words[0].toUpperCase().slice(0, 4);
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
}

export function parseSkipFloors(text: string): Set<number> {
  const out = new Set<number>();
  for (const part of text.split(/[\s,]+/)) {
    const n = Number(part);
    if (part && Number.isInteger(n) && n > 0) out.add(n);
  }
  return out;
}

const pad = (n: number, width: number) => String(n).padStart(width, '0');
const join = (prefix: string, rest: string) => (prefix.trim() ? `${prefix.trim()}-${rest}` : rest);

export function laneName(i: number, style: LaneLabel) {
  return style === 'LETTER' ? letter(i) : String(i + 1);
}

/** Floors that carry homes, bottom to top, with the real floor number each one gets. */
export function towerFloors(cfg: TowerConfig): number[] {
  const skip = parseSkipFloors(cfg.skipFloors);
  const floors: number[] = [];
  let f = 1;
  while (floors.length < cfg.floors && f <= MAX_FLOOR) {
    if (!skip.has(f)) floors.push(f);
    f++;
  }
  return floors;
}

export function unitsOnFloor(cfg: TowerConfig, floor: number): number {
  if (floor === 0) return cfg.groundFloor === 'PARKING' ? 0 : cfg.groundUnits;
  return cfg.floorOverrides[floor] ?? cfg.unitsPerFloor;
}

export function unitsInLane(cfg: HorizontalConfig, lane: number): number {
  return cfg.laneOverrides[lane] ?? cfg.unitsPerLane;
}

function towerUnits(block: Block): Unit[] {
  const cfg = block.tower;
  const units: Unit[] = [];
  const floors = towerFloors(cfg);
  const maxPerFloor = Math.max(cfg.unitsPerFloor, cfg.groundUnits, ...Object.values(cfg.floorOverrides), 1);
  const width = maxPerFloor > 99 ? 3 : 2;
  let seq = 0;
  const total = floors.reduce((s, f) => s + unitsOnFloor(cfg, f), 0) + unitsOnFloor(cfg, 0);
  const seqWidth = Math.max(2, String(total).length);

  if (cfg.groundFloor !== 'PARKING') {
    for (let u = 1; u <= cfg.groundUnits; u++) {
      const shop = cfg.groundFloor === 'SHOPS';
      const code = shop ? `S${pad(u, width)}` : cfg.numbering === 'SEQUENTIAL' ? pad(++seq, seqWidth) : `G${pad(u, width)}`;
      units.push({ number: join(block.prefix, code), floor: 0, row: 0, col: u - 1, tag: shop ? 'SHOP' : undefined });
    }
  }
  for (const f of floors) {
    const count = unitsOnFloor(cfg, f);
    for (let u = 1; u <= count; u++) {
      const code = cfg.numbering === 'SEQUENTIAL' ? pad(++seq, seqWidth) : `${f}${pad(u, width)}`;
      units.push({ number: join(block.prefix, code), floor: f, row: f, col: u - 1 });
    }
  }
  return units;
}

function horizontalUnits(block: Block): Unit[] {
  const cfg = block.horizontal;
  const units: Unit[] = [];
  const total = Array.from({ length: cfg.lanes }, (_, l) => unitsInLane(cfg, l)).reduce((a, b) => a + b, 0);
  const width = Math.max(2, String(cfg.startAt + total - 1).length);
  const levelCode = (lv: number) => (lv === 0 ? 'G' : String(lv));
  let n = cfg.startAt;
  for (let l = 0; l < cfg.lanes; l++) {
    const count = unitsInLane(cfg, l);
    for (let u = 0; u < count; u++) {
      const base = cfg.numbering === 'PER_LANE' && cfg.lanes > 1
        ? `${laneName(l, cfg.laneLabel)}${pad(cfg.startAt + u, Math.max(2, String(cfg.startAt + count - 1).length))}`
        : pad(n, width);
      n++;
      for (let lv = 0; lv < cfg.levels; lv++) {
        const code = cfg.levels > 1 ? `${base}-${levelCode(lv)}` : base;
        units.push({ number: join(block.prefix, code), floor: lv, row: l, col: u, level: lv });
      }
    }
  }
  return units;
}

/** One unit per line or comma. Add a floor with "101 @ 1". */
function customUnits(block: Block): Unit[] {
  const units: Unit[] = [];
  const lines = block.customText.split(/[\n,]/).flatMap((item): [string, number | null][] => {
    const t = item.trim();
    if (!t) return [];
    const withFloor = t.match(/^(.+?)\s*@\s*(\d{1,3})$/);
    return withFloor ? [[withFloor[1].trim(), Number(withFloor[2])]] : [[t, null]];
  });
  lines.forEach(([raw, floorGiven], i) => {
    const number = join(block.prefix, raw);
    const digits = raw.match(/(\d+)\s*$/)?.[1];
    const guess = digits && parseInt(digits, 10) >= 100 ? Math.floor(parseInt(digits, 10) / 100) : 0;
    const floor = floorGiven ?? guess;
    units.push({ number, floor, row: floor, col: i });
  });
  return units;
}

export function generateUnits(block: Block): Unit[] {
  const o = BLOCK_KINDS[block.kind].orientation;
  if (o === 'VERTICAL') return towerUnits(block);
  if (o === 'HORIZONTAL') return horizontalUnits(block);
  return customUnits(block);
}

export function validateBlock(block: Block, units: Unit[], allBlocks: Block[]): string[] {
  const problems: string[] = [];
  if (!block.name.trim()) problems.push('Give this block a name.');
  if (allBlocks.some((b) => b.key !== block.key && b.name.trim().toLowerCase() === block.name.trim().toLowerCase())) {
    problems.push(`Another block is already called "${block.name.trim()}".`);
  }
  if (!units.length) problems.push('This block has no units yet.');
  if (units.length > 5000) problems.push('A block can have at most 5,000 units. Split it into smaller blocks.');
  const long = units.find((u) => u.number.length > MAX_UNIT_LENGTH);
  if (long) problems.push(`"${long.number}" is longer than ${MAX_UNIT_LENGTH} characters. Use a shorter prefix.`);
  const seen = new Set<string>();
  for (const u of units) {
    const k = u.number.toLowerCase();
    if (seen.has(k)) { problems.push(`Unit number "${u.number}" appears twice.`); break; }
    seen.add(k);
  }
  if (units.some((u) => u.floor > MAX_FLOOR)) problems.push(`Floors above ${MAX_FLOOR} are not supported.`);
  const phone = block.secretaryPhone.trim();
  const name = block.secretaryName.trim();
  if (phone || name) {
    if (name.length < 2) problems.push('Enter the secretary\'s name.');
    if (!/^[6-9]\d{9}$/.test(phone)) problems.push('Secretary mobile must be 10 digits starting with 6–9.');
  }
  return problems;
}

/** A one-line description of the block, e.g. "7 floors × 4 flats + parking". */
export function summarize(block: Block, units: Unit[]): string {
  const meta = BLOCK_KINDS[block.kind];
  if (meta.orientation === 'VERTICAL') {
    const c = block.tower;
    const ground = c.groundFloor === 'PARKING' ? 'stilt parking' : c.groundFloor === 'SHOPS' ? `${c.groundUnits} shops` : `${c.groundUnits} ground flats`;
    const custom = Object.keys(c.floorOverrides).length ? ' (custom floors)' : '';
    return `G + ${c.floors} floors · ${c.unitsPerFloor}/floor${custom} · ${ground}`;
  }
  if (meta.orientation === 'HORIZONTAL') {
    const c = block.horizontal;
    const positions = units.length / Math.max(1, c.levels);
    const lanes = c.lanes > 1 ? `${c.lanes} lanes · ` : '';
    const levels = c.levels > 1 ? ` · G+${c.levels - 1} as separate homes` : '';
    return `${lanes}${positions} ${meta.unitWord}${positions === 1 ? '' : 's'}${levels}`;
  }
  return `${units.length} unit${units.length === 1 ? '' : 's'} from list`;
}

export function plural(n: number, word: string) {
  return `${n.toLocaleString('en-IN')} ${word}${n === 1 ? '' : 's'}`;
}
