'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { UNIT_FAMILIES, convertUnitAmount, formatUnitAmount, parseUnitAmount } from '@/lib/unit-converter';
import type { UnitFamilyId } from '@/lib/unit-converter';

export function UnitConverter() {
  const [familyId, setFamilyId] = useState<UnitFamilyId>('length');
  const [amount, setAmount] = useState('');
  const [fromId, setFromId] = useState('m');
  const [toId, setToId] = useState('cm');
  const [digits, setDigits] = useState(10);
  const [status, setStatus] = useState('Escribe una cantidad para ver su equivalencia.');
  const [copyError, setCopyError] = useState('');
  const revision = useRef(0);
  const family = UNIT_FAMILIES.find((item) => item.id === familyId)!;
  const target = family.units.find((item) => item.id === toId)!;
  let result = '';
  let error = '';
  if (amount.trim()) {
    try { result = `${formatUnitAmount(convertUnitAmount(parseUnitAmount(amount), familyId, fromId, toId), digits)} ${target.symbol}`; }
    catch (failure) { error = failure instanceof Error ? failure.message : 'Revisa la cantidad y las unidades.'; }
  }

  function changed() {
    revision.current++;
    setCopyError('');
    setStatus('El resultado se actualiza con la cantidad y las unidades elegidas.');
  }

  const clear = useCallback(() => {
    revision.current++;
    setAmount('');
    setCopyError('');
    setStatus('Sesión limpia. El portapapeles del sistema no se ha modificado.');
  }, []);

  useEffect(() => {
    const restore = (event: PageTransitionEvent) => { if (event.persisted) clear(); };
    window.addEventListener('pagehide', clear);
    window.addEventListener('pageshow', restore);
    return () => { window.removeEventListener('pagehide', clear); window.removeEventListener('pageshow', restore); };
  }, [clear]);

  async function copy() {
    if (!result) return;
    const currentRevision = revision.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(`${result} — ${target.name}`);
      if (currentRevision === revision.current) setStatus('Resultado y nombre de unidad copiados al portapapeles.');
    } catch {
      if (currentRevision === revision.current) setCopyError('El navegador no permitió copiar. Selecciona el resultado y cópialo manualmente.');
    }
  }

  return <section className="rounded-3xl border border-border bg-card p-5 sm:p-6" aria-label="Convertidor de unidades">
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="min-w-0 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="unit-family">Familia de unidades</Label>
          <NativeSelect id="unit-family" className="w-full [&_select]:h-11" value={familyId} onChange={(event) => {
            changed(); const next = UNIT_FAMILIES.find((item) => item.id === event.target.value)!;
            setFamilyId(next.id); setFromId(next.units[0].id); setToId(next.units[1].id);
          }}>{UNIT_FAMILIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit-amount">Cantidad de origen</Label>
          <Input id="unit-amount" value={amount} autoComplete="off" spellCheck={false} placeholder="Ejemplo: 12,5" className="h-11 font-mono" aria-invalid={Boolean(error)} aria-describedby="unit-number-help unit-range-help unit-error" onChange={(event) => { changed(); setAmount(event.target.value); }} />
          <p id="unit-number-help" className="text-sm leading-6 text-muted-foreground">Coma o punto decimal, sin separadores de miles. Ejemplos: 12,5; 12.5; 1000. También puedes usar 1e6 (un millón). Valores como 1,234 o 1.234 son ambiguos: usa 1234 para miles o 1,2340 para decimales.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2"><Label htmlFor="unit-from">Unidad de origen</Label><NativeSelect id="unit-from" className="w-full [&_select]:h-11" value={fromId} onChange={(event) => { changed(); setFromId(event.target.value); }}>{family.units.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.symbol})</option>)}</NativeSelect></div>
          <div className="min-w-0 space-y-2"><Label htmlFor="unit-to">Unidad de destino</Label><NativeSelect id="unit-to" className="w-full [&_select]:h-11" value={toId} onChange={(event) => { changed(); setToId(event.target.value); }}>{family.units.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.symbol})</option>)}</NativeSelect></div>
        </div>
        <Button type="button" className="min-h-11" variant="outline" onClick={() => { changed(); setFromId(toId); setToId(fromId); }}><ArrowLeftRight aria-hidden="true" className="size-4" /> Intercambiar unidades</Button>
        <p className="text-sm leading-6 text-muted-foreground">Intercambiar mantiene la cantidad de origen y cambia el sentido de la conversión.</p>
        <p id="unit-range-help" className="text-sm leading-6 text-muted-foreground">{family.note} {familyId !== 'temperature' && familyId !== 'length' ? 'No se admiten cantidades negativas.' : ''} Se rechazan valores no finitos y resultados que exceden el rango del navegador o se pierden a cero.</p>
        {error ? <p id="unit-error" role="alert" className="text-sm leading-6 text-destructive">{error}</p> : <span id="unit-error" />}
      </div>
      <div className="min-w-0 rounded-2xl border border-border bg-muted/35 p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Tu resultado</h2>
        <output aria-label="Resultado de la conversión" aria-live="polite" className="mt-5 block rounded-xl border border-border bg-card p-4 font-mono text-2xl [overflow-wrap:anywhere]">{result || (error ? 'Revisa la cantidad' : 'Sin resultado')}</output>
        {result ? <p className="mt-2 text-sm text-muted-foreground">{target.name} ({target.symbol})</p> : null}
        <div className="mt-5 space-y-2"><Label htmlFor="unit-precision">Precisión del resultado</Label><NativeSelect id="unit-precision" className="w-full [&_select]:h-11" value={digits} onChange={(event) => { changed(); setDigits(Number(event.target.value)); }}>{[3, 6, 10, 15].map((count) => <option key={count} value={count}>{count} cifras</option>)}</NativeSelect></div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Se redondea solo al mostrar y copiar, al valor más cercano con hasta {digits} cifras significativas; los empates se alejan de cero. Se omiten ceros finales. El cálculo conserva la precisión del navegador (aproximadamente 15 cifras). La notación e indica una potencia de diez.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Button type="button" className="min-h-11" disabled={!result} onClick={() => void copy()}><Copy aria-hidden="true" className="size-4" /> Copiar resultado</Button><Button type="button" className="min-h-11" variant="ghost" onClick={clear}><Trash2 aria-hidden="true" className="size-4" /> Limpiar sesión</Button></div>
        <output aria-label="Estado de la conversión" aria-live="polite" className="mt-4 block text-sm leading-6 text-muted-foreground">{status}</output>
        {copyError ? <p role="alert" className="mt-3 text-sm text-destructive">{copyError}</p> : null}
        <p className="mt-5 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">Ejemplo de referencia: {family.example}.</p>
      </div>
    </div>
    <details className="mt-6 border-t border-border pt-5 text-sm leading-6 text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">Referencias y límites de cálculo</summary><div className="mt-3 space-y-3"><p>Factores incluidos en esta herramienta: <a className="text-primary underline underline-offset-4" href="https://www.nist.gov/system/files/documents/2025/12/30/appc-26-HB44-20251222.pdf" target="_blank" rel="noreferrer">NIST Handbook 44 (2026), apéndice C</a>. Temperatura y galón imperial: <a className="text-primary underline underline-offset-4" href="https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8" target="_blank" rel="noreferrer">NIST SP 811 (2008), apéndice B.8</a>. Almacenamiento: <a className="text-primary underline underline-offset-4" href="https://physics.nist.gov/cuu/Units/binary.html" target="_blank" rel="noreferrer">prefijos binarios IEC publicados por NIST</a>.</p><p>Fórmulas de temperatura: K = °C + 273,15; °C = (°F − 32) / 1,8. Para las demás familias, resultado = cantidad × factor de origen / factor de destino. La comprobación de ida y vuelta usa una tolerancia relativa de 2 × 10⁻¹² y absoluta de 10⁻¹⁰ para temperatura.</p><p>No convierte divisas ni calcula tarifas. La cantidad permanece en memoria; limpiar o salir elimina la entrada. Los enlaces de referencia se abren solo si los eliges. Las conversiones no requieren consultar una API ni descargar un motor. El portapapeles depende de tu sistema.</p></div></details>
  </section>;
}
