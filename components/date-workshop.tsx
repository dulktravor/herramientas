'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CalendarDays, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  CALENDAR_MIN, CALENDAR_MAX, ZONE_DATE_MIN, ZONE_DATE_MAX,
  addCalendarDays, availableTimeZones, calendarDifference, formatZonedInstant, resolveLocalTime,
} from '@/lib/date-tools';

type Mode = 'difference' | 'add' | 'zone';
const modes: { value: Mode; label: string }[] = [
  { value: 'difference', label: 'Días entre fechas' },
  { value: 'add', label: 'Sumar o restar días' },
  { value: 'zone', label: 'Convertir horario' },
];

function subscribeHydration() { return () => undefined; }

export function DateWorkshop() {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  return hydrated ? <DateWorkshopContent /> : <output aria-live="polite">Preparando el calendario y las zonas de tu navegador…</output>;
}

function DateWorkshopContent() {
  const [zones] = useState(availableTimeZones);
  const [detectedZone] = useState(() => {
    try { return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch { return 'No disponible; se usa UTC. Puedes elegir otra zona.'; }
  });
  const [mode, setMode] = useState<Mode>('difference');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [amount, setAmount] = useState('');
  const [inclusive, setInclusive] = useState(false);
  const [time, setTime] = useState('');
  const [sourceZone, setSourceZone] = useState(zones.includes(detectedZone) ? detectedZone : 'UTC');
  const [targetZone, setTargetZone] = useState(zones.includes('America/Bogota') ? 'America/Bogota' : 'UTC');
  const [candidates, setCandidates] = useState<number[]>([]);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Introduce las fechas y calcula el resultado.');
  const [copying, setCopying] = useState(false);
  const revision = useRef(0);
  const resultField = useRef<HTMLTextAreaElement>(null);

  const invalidate = useCallback(() => {
    revision.current++;
    setResult(''); setCandidates([]); setError(''); setCopying(false);
    setStatus('Introduce los datos y calcula el resultado.');
  }, []);

  const clear = useCallback(() => {
    invalidate(); setStart(''); setEnd(''); setAmount(''); setTime(''); setInclusive(false);
    if (resultField.current) resultField.current.value = '';
    setStatus('Sesión limpia. El portapapeles depende de tu sistema.');
  }, [invalidate]);

  useEffect(() => {
    const field = resultField.current;
    const activeRevision = revision;
    const onShow = (event: PageTransitionEvent) => { if (event.persisted) clear(); };
    window.addEventListener('pagehide', clear);
    window.addEventListener('pageshow', onShow);
    return () => {
      activeRevision.current++;
      window.removeEventListener('pagehide', clear);
      window.removeEventListener('pageshow', onShow);
      if (field) field.value = '';
    };
  }, [clear]);

  function showConversion(instant: number, occurrence = '') {
    setCandidates([]);
    setResult(`Origen: ${formatZonedInstant(instant, sourceZone)}${occurrence ? ` — ${occurrence}` : ''}\nDestino: ${formatZonedInstant(instant, targetZone)}\nInstante UTC: ${new Date(instant).toISOString()}\nAmbos horarios representan el mismo instante.`);
    setStatus('Horario convertido. Las zonas y sus desplazamientos aparecen en el resultado.');
  }

  function calculate() {
    invalidate();
    try {
      if (mode === 'difference') {
        const days = calendarDifference(start, end, inclusive);
        setResult(`${days} días de calendario\nDesde ${start} hasta ${end}\n${inclusive ? 'Incluye ambas fechas; una misma fecha cuenta como 1 día.' : 'No incluye ambos extremos; una misma fecha cuenta como 0 días.'}\n${days < 0 ? 'Orden invertido: el resultado es negativo.\n' : ''}Calendario gregoriano, sin zona horaria. No representa una duración en horas.`);
        setStatus('Diferencia calculada según la regla de extremos elegida.');
      } else if (mode === 'add') {
        if (!/^[+-]?\d+$/.test(amount.trim())) throw new Error('Introduce una cantidad entera de días; usa un signo menos para restar.');
        const date = addCalendarDays(start, Number(amount));
        setResult(`Fecha calculada: ${date}\nFecha inicial: ${start}\nDías de calendario: ${Number(amount)}\nEl día inicial cuenta como día 0. Calendario gregoriano, sin zona horaria.`);
        setStatus('Fecha calculada. Se añaden días de calendario, sin asumir días de 24 horas.');
      } else {
        const resolved = resolveLocalTime(start, time, sourceZone);
        if (resolved.kind === 'nonexistent') {
          throw new Error('Esta hora local no existe en la zona de origen por un cambio de horario. Elige otra hora o fecha; no se ajusta automáticamente.');
        }
        if (resolved.kind === 'ambiguous') {
          setCandidates(resolved.instants);
          setStatus('Esta hora local ocurre más de una vez. Elige explícitamente una ocurrencia para convertirla.');
        } else showConversion(resolved.instants[0]);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo calcular. Revisa las fechas, la hora y las zonas.');
      setStatus('No se ha generado un resultado.');
    }
  }

  async function copy() {
    if (!result || copying) return;
    const currentRevision = revision.current;
    setCopying(true); setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(result);
      if (currentRevision === revision.current) setStatus('Resultado copiado con fechas inequívocas y las reglas del cálculo.');
    } catch {
      if (currentRevision === revision.current) setError('El navegador no permitió copiar. Selecciona el resultado y cópialo manualmente.');
    } finally { if (currentRevision === revision.current) setCopying(false); }
  }

  return <section className="rounded-3xl border border-border bg-card p-5 sm:p-6" aria-label="Taller de fechas y horarios">
    <div className="flex flex-wrap gap-2" aria-label="Tipo de cálculo">
      {modes.map(item => <Button key={item.value} type="button" className="min-h-10 whitespace-normal" variant={mode === item.value ? 'secondary' : 'outline'} aria-pressed={mode === item.value} onClick={() => { invalidate(); setMode(item.value); }}>{item.label}</Button>)}
    </div>
    <p className="mt-5 break-words text-sm leading-6 text-muted-foreground">Zona detectada: <span className="font-medium text-foreground">{detectedZone}</span>. Los cálculos de calendario no usan una zona. La conversión horaria permite cambiar origen y destino.</p>
    <div className="mt-6 grid min-w-0 gap-8 lg:grid-cols-2">
      <form className="min-w-0 space-y-5" onSubmit={event => { event.preventDefault(); calculate(); }} noValidate autoComplete="off">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="date-start">{mode === 'difference' ? 'Fecha inicial' : mode === 'add' ? 'Fecha de partida' : 'Fecha en la zona de origen'}</Label>
          <Input id="date-start" type="date" className="h-11 min-w-0" min={mode === 'zone' ? ZONE_DATE_MIN : CALENDAR_MIN} max={mode === 'zone' ? ZONE_DATE_MAX : CALENDAR_MAX} value={start} onChange={event => { invalidate(); setStart(event.target.value); }} data-private="true" />
        </div>
        {mode === 'difference' ? <>
          <div className="min-w-0 space-y-2"><Label htmlFor="date-end">Fecha final</Label><Input id="date-end" type="date" className="h-11 min-w-0" min={CALENDAR_MIN} max={CALENDAR_MAX} value={end} onChange={event => { invalidate(); setEnd(event.target.value); }} data-private="true" /></div>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" className="size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-ring" checked={inclusive} onChange={event => { invalidate(); setInclusive(event.target.checked); }} />Incluir ambas fechas</label>
          <p className="text-sm leading-6 text-muted-foreground">Sin incluir ambos extremos, del 1 al 2 son 1 día; incluyéndolos son 2 días. Una fecha igual cuenta como 0 o 1. Al invertir el orden, el resultado lleva signo negativo.</p>
        </> : mode === 'add' ? <>
          <div className="space-y-2"><Label htmlFor="date-amount">Días que sumar o restar</Label><Input id="date-amount" type="text" inputMode="text" className="h-11" placeholder="Por ejemplo: 7 o -7" value={amount} onChange={event => { invalidate(); setAmount(event.target.value); }} data-private="true" /><p className="text-sm leading-6 text-muted-foreground">Usa un entero positivo para sumar o negativo para restar. La fecha inicial cuenta como día 0.</p></div>
        </> : <>
          <div className="space-y-2"><Label htmlFor="date-time">Hora en la zona de origen</Label><Input id="date-time" type="time" step={1} className="h-11 min-w-0" value={time} onChange={event => { invalidate(); setTime(event.target.value); }} data-private="true" /></div>
          <div className="space-y-2"><Label htmlFor="date-source-zone">Zona de origen</Label><NativeSelect id="date-source-zone" className="w-full min-w-0 [&_select]:h-11" value={sourceZone} onChange={event => { invalidate(); setSourceZone(event.target.value); }}>{zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}</NativeSelect></div>
          <div className="space-y-2"><Label htmlFor="date-target-zone">Zona de destino</Label><NativeSelect id="date-target-zone" className="w-full min-w-0 [&_select]:h-11" value={targetZone} onChange={event => { invalidate(); setTargetZone(event.target.value); }}>{zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}</NativeSelect></div>
          <p className="text-sm leading-6 text-muted-foreground">Fechas de 1900 a 2100; reloj de 24 horas. Si una hora se repite, debes elegir su ocurrencia. Si no existe, debes corregirla. Las reglas de zona provienen de tu navegador y pueden cambiar con sus actualizaciones.</p>
        </>}
        {mode !== 'zone' ? <p className="text-sm leading-6 text-muted-foreground">Calendario gregoriano; años 0001 a 9999. Se cuentan todos los días de calendario, incluidos fines de semana y festivos. Un día de calendario puede durar 23, 24 o 25 horas en una zona con cambio estacional.</p> : null}
        <Button type="submit" className="min-h-11 w-full sm:w-auto"><CalendarDays className="size-4" aria-hidden="true" />{mode === 'zone' ? 'Convertir horario' : 'Calcular'}</Button>
      </form>
      <div className="min-w-0 rounded-2xl border border-border bg-muted/35 p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Tu resultado</h2>
        {candidates.length ? <fieldset className="mt-5 space-y-3"><legend className="text-sm font-medium">Hora repetida: elige una ocurrencia</legend>{candidates.map((instant, index) => <Button type="button" key={instant} variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal break-words py-3 text-left" onClick={() => { try { showConversion(instant, `ocurrencia ${index + 1}`); } catch { setError('No se pudo convertir a la zona de destino. Elige otra zona.'); } }}>Ocurrencia {index + 1}: {formatZonedInstant(instant, sourceZone)}</Button>)}</fieldset> : null}
        <Label htmlFor="date-result" className="mt-5">Resultado del cálculo</Label>
        <Textarea ref={resultField} id="date-result" readOnly value={result} placeholder="El resultado aparecerá aquí" className="mt-3 min-h-48 w-full min-w-0 break-words bg-card font-mono text-sm leading-6" data-private="true" spellCheck={false} />
        <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="secondary" className="min-h-10" disabled={!result || copying} onClick={() => void copy()}><Copy className="size-4" aria-hidden="true" />{copying ? 'Copiando…' : 'Copiar resultado'}</Button><Button type="button" variant="ghost" className="min-h-10" onClick={clear}><Trash2 className="size-4" aria-hidden="true" />Limpiar sesión</Button></div>
        <output className="mt-5 block text-sm leading-6 text-muted-foreground" aria-live="polite">{status}</output>
        {error ? <p role="alert" className="mt-3 text-sm leading-6 text-destructive">{error}</p> : null}
      </div>
    </div>
    <p className="mt-6 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">Fechas, horas y resultados se mantienen en memoria. Cambiar entradas elimina el resultado anterior; limpiar o salir elimina el contenido de la sesión. No se consultan servicios de zonas ni calendarios de festivos. El portapapeles depende de tu sistema.</p>
  </section>;
}
