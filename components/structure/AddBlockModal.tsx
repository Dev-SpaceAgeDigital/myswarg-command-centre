'use client';
import { useEffect, useMemo, useState } from 'react';
import { X, LoaderCircle, Sparkles, TriangleAlert, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import ActivationCodeModal, { ActivationInfo, CodeEntry } from '@/components/ActivationCodeModal';
import { Block, BlockKind, createBlock, generateUnits, validateBlock, plural } from '@/lib/property-layout';
import { createBlock as createBlockOnServer, errorMessage } from '@/lib/create-structure';
import BlockEditor from './BlockEditor';

/** Adds one block (tower, bungalows, tenements…) with all its units to an existing society. */
export default function AddBlockModal({
  societyId, existingNames, initialKind = 'TOWER', onClose, onSuccess,
}: {
  societyId: string;
  existingNames: string[];
  initialKind?: BlockKind;
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Existing wings stand in as blocks so default names and duplicates are checked against them.
  const others = useMemo<Block[]>(
    () => existingNames.map((name) => ({ ...createBlock('CUSTOM'), name, kind: name.startsWith('Wing ') ? 'TOWER' : 'CUSTOM' })),
    [existingNames],
  );
  const [block, setBlock] = useState<Block>(() => createBlock(initialKind, others));
  const all = useMemo(() => [...others, block], [others, block]);
  const units = useMemo(() => generateUnits(block), [block]);
  const problems = validateBlock(block, units, all);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [wing, setWing] = useState<{ id: string; activation: ActivationInfo | null; secretaryError: string } | null>(null);
  const [codes, setCodes] = useState<CodeEntry[] | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, busy]);

  const submit = async () => {
    if (problems.length) return;
    setBusy(true); setError('');
    try {
      const r = await createBlockOnServer(societyId, block, units, {
        existingWingId: wing?.id,
        onProgress: (done, total) => setProgress({ done, total }),
        onWing: (id, activation, secretaryError) => setWing({ id, activation, secretaryError }),
      });
      const activation = r.secretaryActivation ?? wing?.activation ?? null;
      const secretaryError = r.secretaryError || wing?.secretaryError || '';
      toast.success(`${block.name} created with ${plural(r.unitsCreated + r.unitsSkipped, 'unit')}`);
      if (secretaryError) toast.error(`Secretary not added: ${secretaryError}`);
      if (r.unitErrors.length) toast.error(`${r.unitErrors.length} unit(s) were not created: ${r.unitErrors[0]}`);
      if (activation) setCodes([{ name: block.secretaryName.trim(), phone: block.secretaryPhone, activation }]);
      else onSuccess();
    } catch (err) {
      setError(errorMessage(err, 'Could not create the block'));
    } finally {
      setBusy(false);
    }
  };

  if (codes) return <ActivationCodeModal title="Share with the Secretary" entries={codes} onClose={onSuccess} />;

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-3xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Add a block</h2>
            <p className="text-xs text-gray-500 mt-0.5">A tower that goes up, or houses and plots that spread out.</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close" className="p-2 -mr-2 hover:bg-gray-100 rounded-xl text-gray-400 disabled:opacity-40">
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          <BlockEditor block={block} allBlocks={all} onChange={setBlock} />
        </div>
        <footer className="px-5 sm:px-7 py-4 border-t border-gray-100 space-y-3">
          {busy && progress && (
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 flex items-start gap-1.5">
              <TriangleAlert size={15} className="mt-0.5 flex-shrink-0" />
              <span>{error}{wing ? ' The block was created — press Retry to finish its units.' : ''}</span>
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <button onClick={onClose} disabled={busy} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40">Cancel</button>
            <button onClick={submit} disabled={busy || problems.length > 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {busy ? <><LoaderCircle size={16} className="animate-spin" /> {progress ? `${progress.done}/${progress.total}` : 'Creating…'}</>
                : wing ? <><RotateCcw size={15} /> Retry</>
                : <><Sparkles size={15} /> Create {plural(units.length, 'unit')}</>}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
