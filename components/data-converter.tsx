'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Braces,
  Check,
  Clipboard,
  Download,
  FileUp,
  Sparkles,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { downloadBlob } from '@/lib/browser-files';

type DataFormat = 'auto' | 'json' | 'csv' | 'tsv' | 'xml';
type OutputFormat = Exclude<DataFormat, 'auto'>;
type DataRow = Record<string, string | number | boolean | null>;

const examples: Record<OutputFormat, string> = {
  json: '[\n  { "nombre": "Ana", "ciudad": "Bogotá" },\n  { "nombre": "Luis", "ciudad": "Medellín" }\n]',
  csv: 'nombre,ciudad\nAna,Bogotá\nLuis,Medellín',
  tsv: 'nombre\tciudad\nAna\tBogotá\nLuis\tMedellín',
  xml: '<registros>\n  <registro><nombre>Ana</nombre><ciudad>Bogotá</ciudad></registro>\n  <registro><nombre>Luis</nombre><ciudad>Medellín</ciudad></registro>\n</registros>',
};

function parseDelimited(input: string, delimiter: ',' | '\t') {
  const matrix: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) matrix.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) matrix.push(row);
  if (quoted) throw new Error('Hay una comilla sin cerrar en los datos delimitados.');
  if (matrix.length < 2) throw new Error('Se necesita una fila de encabezados y al menos una fila de datos.');

  const headers = matrix[0].map((header, index) => header.trim() || `columna_${index + 1}`);
  return matrix.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])) as DataRow,
  );
}

function normalizeJson(value: unknown): DataRow[] {
  let records: unknown[];
  if (Array.isArray(value)) records = value;
  else if (value && typeof value === 'object') {
    const arrayValue = Object.values(value).find(Array.isArray);
    records = Array.isArray(arrayValue) ? arrayValue : [value];
  } else records = [{ valor: value }];

  return records.map((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return { valor: JSON.stringify(record) ?? '' };
    return Object.fromEntries(
      Object.entries(record).map(([key, cell]) => [
        key,
        cell !== null && typeof cell === 'object' ? JSON.stringify(cell) : (cell as string | number | boolean | null),
      ]),
    );
  });
}

function parseXml(input: string) {
  const documentNode = new DOMParser().parseFromString(input, 'application/xml');
  if (documentNode.querySelector('parsererror')) throw new Error('El XML no es válido. Revisa sus etiquetas.');
  const root = documentNode.documentElement;
  const directChildren = Array.from(root.children);
  const repeated = directChildren.length > 1 && new Set(directChildren.map((child) => child.tagName)).size === 1;
  const records = repeated ? directChildren : [root];

  return records.map((record) => {
    const row: DataRow = {};
    Array.from(record.attributes).forEach((attribute) => { row[`@${attribute.name}`] = attribute.value; });
    Array.from(record.children).forEach((child) => { row[child.tagName] = child.textContent?.trim() ?? ''; });
    if (Object.keys(row).length === 0) row.valor = record.textContent?.trim() ?? '';
    return row;
  });
}

function detectFormat(input: string): OutputFormat {
  const trimmed = input.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return 'xml';
  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? '';
  return firstLine.includes('\t') ? 'tsv' : 'csv';
}

function parseInput(input: string, requested: DataFormat) {
  const format = requested === 'auto' ? detectFormat(input) : requested;
  if (format === 'json') return { rows: normalizeJson(JSON.parse(input) as unknown), format };
  if (format === 'xml') return { rows: parseXml(input), format };
  return { rows: parseDelimited(input, format === 'tsv' ? '\t' : ','), format };
}

function columnsFor(rows: DataRow[]) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))];
}

function serializeDelimited(rows: DataRow[], delimiter: ',' | '\t') {
  const columns = columnsFor(rows);
  const escape = (cell: DataRow[string]) => {
    const value = String(cell ?? '');
    return /["\r\n,\t]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  };
  return [columns.map(escape).join(delimiter), ...rows.map((row) => columns.map((column) => escape(row[column])).join(delimiter))].join('\n');
}

function xmlName(value: string) {
  const cleaned = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `campo_${cleaned}`;
}

function escapeXml(value: DataRow[string]) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function serialize(rows: DataRow[], format: OutputFormat) {
  if (format === 'json') return JSON.stringify(rows, null, 2);
  if (format === 'csv') return serializeDelimited(rows, ',');
  if (format === 'tsv') return serializeDelimited(rows, '\t');
  const columns = columnsFor(rows);
  const records = rows.map((row) => `  <registro>\n${columns.map((column) => `    <${xmlName(column)}>${escapeXml(row[column])}</${xmlName(column)}>`).join('\n')}\n  </registro>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<registros>\n${records.join('\n')}\n</registros>`;
}

export function DataConverter() {
  const [input, setInput] = useState('');
  const [sourceFormat, setSourceFormat] = useState<DataFormat>('auto');
  const [targetFormat, setTargetFormat] = useState<OutputFormat>('json');
  const [rows, setRows] = useState<DataRow[]>([]);
  const [detected, setDetected] = useState<OutputFormat | null>(null);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const columns = useMemo(() => columnsFor(rows), [rows]);

  function convert(nextTarget = targetFormat) {
    setError('');
    if (!input.trim()) {
      setError('Pega datos o selecciona un archivo para comenzar.');
      return;
    }
    try {
      const parsed = parseInput(input, sourceFormat);
      if (parsed.rows.length === 0) throw new Error('No se encontraron registros para convertir.');
      if (parsed.rows.length > 10_000) throw new Error('Se admiten hasta 10.000 registros por conversión.');
      setRows(parsed.rows);
      setDetected(parsed.format);
      setOutput(serialize(parsed.rows, nextTarget));
    } catch (cause) {
      setRows([]);
      setOutput('');
      setDetected(null);
      setError(cause instanceof Error ? cause.message : 'No fue posible interpretar estos datos.');
    }
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10 MB.');
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    const inferred = extension === 'json' || extension === 'xml' || extension === 'csv' || extension === 'tsv' ? extension : 'auto';
    setInput(await file.text());
    setSourceFormat(inferred);
    setRows([]);
    setOutput('');
    setError('');
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
          <label htmlFor="source-format" className="space-y-2 text-sm font-medium">
            Formato de origen
            <NativeSelect id="source-format" className="w-full" value={sourceFormat} onChange={(event) => setSourceFormat(event.target.value as DataFormat)}>
              <NativeSelectOption value="auto">Detectar automáticamente</NativeSelectOption>
              <NativeSelectOption value="json">JSON</NativeSelectOption>
              <NativeSelectOption value="csv">CSV</NativeSelectOption>
              <NativeSelectOption value="tsv">TSV</NativeSelectOption>
              <NativeSelectOption value="xml">XML</NativeSelectOption>
            </NativeSelect>
          </label>
          <ArrowRight className="hidden size-5 text-muted-foreground lg:block" aria-hidden="true" />
          <label htmlFor="target-format" className="space-y-2 text-sm font-medium">
            Convertir a
            <NativeSelect
              id="target-format"
              className="w-full"
              value={targetFormat}
              onChange={(event) => {
                const next = event.target.value as OutputFormat;
                setTargetFormat(next);
                if (rows.length) setOutput(serialize(rows, next));
              }}
            >
              <NativeSelectOption value="json">JSON</NativeSelectOption>
              <NativeSelectOption value="csv">CSV</NativeSelectOption>
              <NativeSelectOption value="tsv">TSV</NativeSelectOption>
              <NativeSelectOption value="xml">XML</NativeSelectOption>
            </NativeSelect>
          </label>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="data-input" className="text-sm font-medium">Datos de entrada</label>
              <label htmlFor="data-file" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'cursor-pointer' })}>
                <FileUp aria-hidden="true" /> Abrir archivo
              </label>
              <input id="data-file" type="file" accept=".json,.csv,.tsv,.xml,text/*,application/json,application/xml" className="sr-only" onChange={(event) => { void loadFile(event.target.files?.[0]); event.target.value = ''; }} />
            </div>
            <Textarea
              id="data-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={examples.csv}
              className="min-h-80 resize-y rounded-xl font-mono leading-6"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="data-output" className="text-sm font-medium">Resultado</label>
              {detected ? <span className="text-xs text-muted-foreground">Origen detectado: {detected.toUpperCase()}</span> : null}
            </div>
            <Textarea id="data-output" value={output} readOnly placeholder="El resultado aparecerá aquí." className="min-h-80 resize-y rounded-xl bg-muted/30 font-mono leading-6" />
          </div>
        </div>

        {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="lg" className="rounded-xl" onClick={() => convert()}>
            <Sparkles aria-hidden="true" /> Convertir datos
          </Button>
          <Button variant="secondary" size="lg" className="rounded-xl" disabled={!output} onClick={() => void copyOutput()}>
            {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />} {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button variant="outline" size="lg" className="rounded-xl" disabled={!output} onClick={() => downloadBlob(new Blob([output], { type: 'text/plain;charset=utf-8' }), `datos-convertidos.${targetFormat}`)}>
            <Download aria-hidden="true" /> Descargar .{targetFormat}
          </Button>
        </div>
      </section>

      {rows.length ? (
        <section className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10" aria-labelledby="data-preview-title">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 id="data-preview-title" className="font-semibold tracking-tight">Vista tabular</h2>
              <p className="mt-1 text-xs text-muted-foreground">Primeros {Math.min(rows.length, 8)} de {rows.length} registros</p>
            </div>
            <Braces className="size-5 text-primary" aria-hidden="true" />
          </div>
          <Table>
            <TableHeader><TableRow>{columns.slice(0, 8).map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {rows.slice(0, 8).map((row, index) => (
                <TableRow key={index}>{columns.slice(0, 8).map((column) => <TableCell key={column} className="max-w-56 truncate">{String(row[column] ?? '')}</TableCell>)}</TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">La conversión ocurre completamente en tu navegador. No se suben ni almacenan los datos.</p>
    </div>
  );
}
