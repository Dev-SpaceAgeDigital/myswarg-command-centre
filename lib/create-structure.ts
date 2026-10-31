import api from '@/lib/api';
import type { ActivationInfo } from '@/components/ActivationCodeModal';
import { Block, Unit } from '@/lib/property-layout';

// The import endpoint accepts up to 1000 rows; smaller batches keep each
// request well inside the client timeout and let the progress bar move.
const BATCH = 250;

/** The API's message for a failed request, or a fallback. */
export function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

export interface BlockResult {
  wingId: string;
  unitsCreated: number;
  unitsSkipped: number;
  unitErrors: string[];
  secretaryActivation: ActivationInfo | null;
  secretaryError: string;
}

/**
 * Creates one block (an API "wing") and every unit in it, in batches.
 * Pass `existingWingId` to resume a block whose wing was created but whose
 * units did not all finish; units that already exist are skipped by the API.
 */
export async function createBlock(
  societyId: string,
  block: Block,
  units: Unit[],
  opts: {
    onProgress: (done: number, total: number) => void;
    /** Called as soon as the wing exists, so a failed run can resume it. */
    onWing?: (wingId: string, secretaryActivation: ActivationInfo | null, secretaryError: string) => void;
    existingWingId?: string;
  },
): Promise<BlockResult> {
  const { onProgress, onWing, existingWingId } = opts;
  let wingId = existingWingId;
  let secretaryActivation: ActivationInfo | null = null;
  let secretaryError = '';

  if (!wingId) {
    const payload: Record<string, unknown> = {
      name: block.name.trim(),
      society_id: societyId,
      auto_generate_flats: false,
    };
    if (block.secretaryName.trim() && block.secretaryPhone.trim()) {
      payload.secretary_name = block.secretaryName.trim();
      payload.secretary_phone = block.secretaryPhone.trim();
    }
    const res = await api.post('/superadmin/wings', payload);
    const d = res.data?.data ?? {};
    wingId = d.id as string;
    secretaryActivation = d.secretaryActivation ?? null;
    secretaryError = d.secretaryError ?? '';
    onWing?.(wingId, secretaryActivation, secretaryError);
  }

  let created = 0, skipped = 0;
  const errors: string[] = [];
  onProgress(0, units.length);
  for (let i = 0; i < units.length; i += BATCH) {
    const rows = units.slice(i, i + BATCH).map((u, j) => ({ row: i + j + 1, flat: u.number, floor: u.floor }));
    const res = await api.post(`/superadmin/wings/${wingId}/import`, { rows, dryRun: false });
    const results: { status: string; flat: string; message: string }[] = res.data?.data?.results ?? [];
    for (const r of results) {
      if (r.status === 'created') created++;
      else if (r.status === 'skipped') skipped++;
      else if (r.status === 'error') errors.push(`${r.flat}: ${r.message}`);
    }
    onProgress(Math.min(i + BATCH, units.length), units.length);
  }

  return { wingId: wingId!, unitsCreated: created, unitsSkipped: skipped, unitErrors: errors, secretaryActivation, secretaryError };
}
