'use client';
import { useMemo, useRef, useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import readXlsxFile from 'read-excel-file';
import api from '@/lib/api';

type Status = 'ready' | 'created' | 'skipped' | 'error';
interface RowResult {
  row: number; flat: string; name: string; phone: string; status: Status; message: string;
  activationCode?: string; activationExpiresAt?: string;
}
interface ImportResponse {
  dryRun: boolean; wingName: string;
  summary: { total: number; ok: number; skipped: number; errors: number; flatsCreated: number };
  results: RowResult[];
}
interface SheetRow { row: number; flat: string; floor: string; name: string; phone: string; type: string; family: string }

const MAX_ROWS = 1000;
const TEMPLATE_HEADERS = ['Flat No', 'Floor', 'Resident Name', 'Mobile', 'Type (Owner/Tenant)', 'Family Members'];

// Column headings people actually write, mapped to our fields.
const HEADER_MATCH: Array<[keyof Omit<SheetRow, 'row'>, RegExp]> = [
  ['flat', /^(flat|flat ?no\.?|flat ?number|unit|unit ?no\.?|house|house ?no\.?)$/i],
  ['floor', /^floor/i],
  ['name', /(name|resident|owner ?name)/i],
  ['phone', /(mobile|phone|contact|number)/i],
  ['type', /^(type|owner\/tenant|resident ?type|owner ?or ?tenant)/i],
  ['family', /(family|members|occupants)/i],
];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function toSheetRows(grid: unknown[][]): { rows: SheetRow[]; error?: string } {
  const cells = grid.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c).trim())));
  const headerIdx = cells.findIndex((r) => r.some((c) => c));
  if (headerIdx === -1) return { rows: [], error: 'The file is empty.' };
  const header = cells[headerIdx];
  const col: Partial<Record<keyof Omit<SheetRow, 'row'>, number>> = {};
  header.forEach((h, i) => {
    const label = h.replace(/\s+/g, ' ').trim();
    for (const [field, re] of HEADER_MATCH) {
      if (col[field] === undefined && re.test(label)) { col[field] = i; break; }
    }
  });
  if (col.flat === undefined) return { rows: [], error: 'Could not find a "Flat No" column. Please use the template.' };
  const get = (r: string[], f: keyof Omit<SheetRow, 'row'>) => (col[f] !== undefined ? r[col[f]!] ?? '' : '');
  const rows: SheetRow[] = [];
  cells.slice(headerIdx + 1).forEach((r, i) => {
    if (!r.some((c) => c)) return; // blank line
    rows.push({
      row: headerIdx + i + 2, // spreadsheet row number, counting the heading row
      flat: get(r, 'flat'), floor: get(r, 'floor'), name: get(r, 'name'),
      phone: get(r, 'phone'), type: get(r, 'type'), family: get(r, 'family'),
    });
  });
  return { rows };
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const STATUS_STYLE: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ready: { label: 'Ready', cls: 'text-emerald-700 bg-emerald-50', Icon: CheckCircle2 },
  created: { label: 'Added', cls: 'text-emerald-700 bg-emerald-50', Icon: CheckCircle2 },
  skipped: { label: 'Skipped', cls: 'text-gray-600 bg-gray-100', Icon: MinusCircle },
  error: { label: 'Problem', cls: 'text-red-700 bg-red-50', Icon: AlertTriangle },
};

export default function ImportResidentsModal({
  wingId, wingName, onClose, onDone,
}: { wingId: string; wingName: string; onClose: () => void; onDone: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [onlyProblems, setOnlyProblems] = useState(false);

  const shown = result ?? preview;
  const visibleRows = useMemo(
    () => (shown ? shown.results.filter((r) => !onlyProblems || r.status === 'error') : []),
    [shown, onlyProblems],
  );

  const downloadTemplate = () => downloadCsv(`MySwarg-import-template-${wingName}.csv`, [
    TEMPLATE_HEADERS,
    ['101', '1', 'Ramesh Shah', '9876543210', 'Owner', '4'],
    ['102', '1', 'Priya Patel', '9876501234', 'Tenant', '2'],
    ['103', '1', '', '', '', ''],
  ]);

  const send = async (dryRun: boolean, data: SheetRow[]) => {
    const res = await api.post(`/superadmin/wings/${wingId}/import`, {
      dryRun,
      rows: data.map((r) => ({ row: r.row, flat: r.flat, floor: r.floor, name: r.name, phone: r.phone, type: r.type, family: r.family })),
    });
    return res.data.data as ImportResponse;
  };

  const onFile = async (file: File) => {
    setError(''); setPreview(null); setResult(null); setRows([]); setFileName(file.name);
    setBusy(true);
    try {
      const lower = file.name.toLowerCase();
      let grid: unknown[][];
      if (lower.endsWith('.csv')) grid = parseCsv(await file.text());
      else if (lower.endsWith('.xlsx')) grid = (await readXlsxFile(file)) as unknown[][];
      else { setError('Please upload an .xlsx or .csv file. Older .xls files: open in Excel and "Save As" .xlsx.'); return; }

      const parsed = toSheetRows(grid);
      if (parsed.error) { setError(parsed.error); return; }
      if (!parsed.rows.length) { setError('No rows found below the heading row.'); return; }
      if (parsed.rows.length > MAX_ROWS) { setError(`This file has ${parsed.rows.length} rows. Please import up to ${MAX_ROWS} at a time.`); return; }
      setRows(parsed.rows);
      setPreview(await send(true, parsed.rows));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not read this file. Please use the template.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const runImport = async () => {
    if (!preview || busy) return;
    setBusy(true); setError('');
    try {
      const done = await send(false, rows);
      setResult(done);
      onDone();
    } catch (err: any) {
      setError(err.response?.data?.message || 'The import failed. Nothing was saved for rows that did not finish.');
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    downloadCsv(`MySwarg-import-result-${wingName}.csv`, [
      ['Row', 'Flat', 'Name', 'Mobile', 'Result', 'Details', 'Activation code', 'Code valid until'],
      ...result.results.map((r) => [
        r.row, r.flat, r.name, r.phone, STATUS_STYLE[r.status].label, r.message,
        r.activationCode ?? '', r.activationExpiresAt ? new Date(r.activationExpiresAt).toLocaleDateString('en-IN') : '',
      ]),
    ]);
  };

  const codesIssued = result?.results.filter((r) => r.activationCode).length ?? 0;

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Import flats and residents</h2>
            <p className="text-sm text-gray-500">Wing {wingName}. Up to {MAX_ROWS} rows per file.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-500" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {!result && (
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={downloadTemplate} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-left">
                <Download size={20} className="text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">1. Download the template</p>
                  <p className="text-xs text-gray-500">Opens in Excel. One row per resident; leave name and mobile empty for a vacant flat.</p>
                </div>
              </button>
              <button onClick={() => fileInput.current?.click()} disabled={busy}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-blue-200 hover:bg-blue-50/50 text-left disabled:opacity-60">
                <Upload size={20} className="text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">2. Upload your file</p>
                  <p className="text-xs text-gray-500">{fileName || '.xlsx or .csv'}</p>
                </div>
              </button>
              <input ref={fileInput} type="file" accept=".xlsx,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 text-sm text-blue-700">
              <span className="w-4 h-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              {result || preview ? 'Importing… please keep this window open.' : 'Checking every row…'}
            </div>
          )}

          {shown && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 mr-1">{result ? 'Import finished' : 'Preview'}:</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  {shown.summary.ok} {result ? 'added' : 'ready'}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{shown.summary.skipped} skipped</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium">{shown.summary.errors} with problems</span>
                {shown.summary.flatsCreated > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {shown.summary.flatsCreated} new flat{shown.summary.flatsCreated === 1 ? '' : 's'}
                  </span>
                )}
                <label className="ml-auto flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
                  Show only problems
                </label>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="max-h-[42vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Row</th>
                        <th className="text-left px-3 py-2 font-medium">Flat</th>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Mobile</th>
                        <th className="text-left px-3 py-2 font-medium">Result</th>
                        <th className="text-left px-3 py-2 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((r) => {
                        const st = STATUS_STYLE[r.status];
                        return (
                          <tr key={r.row} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-400">{r.row}</td>
                            <td className="px-3 py-2 font-medium text-gray-900">{r.flat || '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{r.name || '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{r.phone || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                                <st.Icon size={12} /> {st.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{r.message}</td>
                          </tr>
                        );
                      })}
                      {!visibleRows.length && (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No problems found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {result && codesIssued > 0 && (
                <div className="p-3 rounded-xl bg-orange-50 text-sm text-orange-800 flex gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    {codesIssued} activation code{codesIssued === 1 ? ' was' : 's were'} issued. Download the result file now and
                    give each resident their code (or let the Secretary share them). Codes are shown only now and expire in 7 days.
                  </span>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 ring-1 ring-inset ring-red-100 text-sm text-red-600">{error}</div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3">
          {!result ? (
            <>
              <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={runImport}
                disabled={busy || !preview || preview.summary.ok === 0}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FileSpreadsheet size={16} />
                {busy && preview ? 'Importing…' : `Import ${preview?.summary.ok ?? 0} row${preview?.summary.ok === 1 ? '' : 's'}`}
              </button>
            </>
          ) : (
            <>
              <button onClick={downloadReport} className="px-4 py-2.5 border border-blue-200 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-50 flex items-center gap-2">
                <Download size={16} /> Download result{codesIssued ? ' with codes' : ''}
              </button>
              <button onClick={onClose} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
