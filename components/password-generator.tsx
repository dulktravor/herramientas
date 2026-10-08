'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Eye, EyeOff, KeyRound, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { PASSWORD_GROUPS, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, generatePassword, validatePasswordOptions } from '@/lib/password-generator';
import type { PasswordGroup } from '@/lib/password-generator';
import { PASSPHRASE_MAX_WORDS, PASSPHRASE_MIN_WORDS, generatePassphrase, validatePassphraseOptions } from '@/lib/passphrase-generator';
import type { PassphraseSeparator } from '@/lib/passphrase-generator';

const groupLabels: Record<PasswordGroup, string> = {
  lowercase: 'Minúsculas (a–z)', uppercase: 'Mayúsculas (A–Z)', digits: 'Números (0–9)', symbols: 'Símbolos',
};

export function PasswordGenerator() {
  const [mode, setMode] = useState<'password' | 'phrase'>('password');
  const [length, setLength] = useState('20');
  const [groups, setGroups] = useState<PasswordGroup[]>(['lowercase', 'uppercase', 'digits', 'symbols']);
  const [words, setWords] = useState('6');
  const [separator, setSeparator] = useState<PassphraseSeparator>('hyphen');
  const [hasResult, setHasResult] = useState(false);
  const [shown, setShown] = useState(false);
  const [copying, setCopying] = useState(false);
  const [status, setStatus] = useState('Elige tus preferencias y genera un resultado.');
  const [error, setError] = useState('');
  // The secret is held only in the current DOM field, never in React history,
  // persisted settings, URL state, telemetry, or an array of past results.
  const output = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const optionsError = mode === 'password'
    ? validatePasswordOptions({ length: Number(length), groups })
    : validatePassphraseOptions({ words: Number(words), separator });

  const clear = useCallback(() => {
    revision.current++;
    if (output.current) { output.current.value = ''; output.current.type = 'password'; }
    setHasResult(false);
    setShown(false);
    setCopying(false);
    setError('');
    setStatus('Sesión limpia. El portapapeles del sistema no se ha modificado.');
  }, []);

  useEffect(() => {
    const field = output.current;
    window.addEventListener('pagehide', clear);
    return () => {
      window.removeEventListener('pagehide', clear);
      if (field) field.value = '';
    };
  }, [clear]);

  function generate() {
    clear();
    try {
      if (optionsError) throw new Error(optionsError);
      if (!output.current) return;
      output.current.value = mode === 'password'
        ? generatePassword({ length: Number(length), groups })
        : generatePassphrase({ words: Number(words), separator });
      setHasResult(true);
      setStatus(mode === 'password' ? 'Contraseña generada. Puedes mostrarla o copiarla.' : 'Frase generada. Puedes mostrarla o copiarla.');
    } catch (failure) {
      setStatus('No se ha generado ningún resultado.');
      setError(failure instanceof Error ? failure.message : 'No se pudo generar el resultado. Revisa tus preferencias y tu navegador.');
    }
  }

  async function copy() {
    if (!output.current?.value || copying) return;
    const currentRevision = revision.current;
    setCopying(true);
    setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(output.current.value);
      if (currentRevision === revision.current) setStatus('Copiado al portapapeles por tu solicitud.');
    } catch {
      if (currentRevision === revision.current) setError('El navegador no permitió copiar. Muestra el resultado, selecciónalo y cópialo manualmente.');
    } finally { if (currentRevision === revision.current) setCopying(false); }
  }

  function toggleGroup(group: PasswordGroup) {
    clear();
    setGroups((selected) => selected.includes(group) ? selected.filter((item) => item !== group) : [...selected, group]);
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-6" aria-label="Generador de contraseñas y frases">
      <div className="flex flex-wrap gap-2" aria-label="Tipo de resultado">
        <Button type="button" className="min-h-10" variant={mode === 'password' ? 'secondary' : 'outline'} aria-pressed={mode === 'password'} onClick={() => { clear(); setMode('password'); }}>Contraseña</Button>
        <Button type="button" className="min-h-10" variant={mode === 'phrase' ? 'secondary' : 'outline'} aria-pressed={mode === 'phrase'} onClick={() => { clear(); setMode('phrase'); }}>Frase aleatoria</Button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          {mode === 'password' ? <>
            <div className="space-y-2">
              <Label htmlFor="password-length">Longitud de la contraseña</Label>
              <Input id="password-length" className="h-10" type="number" min={PASSWORD_MIN_LENGTH} max={PASSWORD_MAX_LENGTH} step={1} value={length} aria-describedby="password-length-help" aria-invalid={Boolean(optionsError)} onChange={(event) => { clear(); setLength(event.target.value); }} />
              <p id="password-length-help" className="text-sm leading-6 text-muted-foreground">De 4 a 128 caracteres. Para uso habitual, elige 12 o más y revisa los límites del servicio.</p>
            </div>
            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm font-medium">Grupos de caracteres</legend>
              {(Object.keys(PASSWORD_GROUPS) as PasswordGroup[]).map((group) => <label key={group} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                <input type="checkbox" checked={groups.includes(group)} onChange={() => toggleGroup(group)} className="size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-ring" />
                {groupLabels[group]}
              </label>)}
              <p className="text-sm leading-6 text-muted-foreground">Cada grupo seleccionado aparece al menos una vez. Los grupos desmarcados no aparecen.</p>
              <p className="break-all font-mono text-xs leading-6 text-muted-foreground">Símbolos admitidos: {PASSWORD_GROUPS.symbols}</p>
            </fieldset>
          </> : <>
            <div className="space-y-2">
              <Label htmlFor="passphrase-words">Cantidad de palabras</Label>
              <Input id="passphrase-words" className="h-10" type="number" min={PASSPHRASE_MIN_WORDS} max={PASSPHRASE_MAX_WORDS} step={1} value={words} aria-describedby="passphrase-help" aria-invalid={Boolean(optionsError)} onChange={(event) => { clear(); setWords(event.target.value); }} />
              <p id="passphrase-help" className="text-sm leading-6 text-muted-foreground">De 6 a 12 palabras elegidas de forma independiente; pueden repetirse. Cuatro compuestos del diccionario contienen guion interno; cada compuesto cuenta como una palabra.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="passphrase-separator">Separador entre palabras</Label>
              <NativeSelect id="passphrase-separator" className="w-full [&_select]:h-10" value={separator} onChange={(event) => { clear(); setSeparator(event.target.value as PassphraseSeparator); }}>
                <option value="hyphen">Guion (-)</option><option value="space">Espacio</option><option value="underscore">Guion bajo (_)</option><option value="period">Punto (.)</option>
              </NativeSelect>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">Diccionario local: EFF Long Wordlist, 7.776 palabras en inglés, creado por Joseph Bonneau / Electronic Frontier Foundation. Se incluye con la herramienta y no se consulta un servicio para elegir palabras.</p>
            <p className="text-sm leading-6 text-muted-foreground">Atribución: <a href="https://www.eff.org/dice" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">Electronic Frontier Foundation</a>, licencia <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">CC BY 4.0</a>. Se han retirado los índices de dados; las palabras se conservan.</p>
          </>}
          {optionsError ? <p role="alert" className="text-sm leading-6 text-destructive">{optionsError}</p> : null}
          <Button type="button" onClick={generate} disabled={Boolean(optionsError)} className="min-h-11 w-full sm:w-auto"><KeyRound className="size-4" aria-hidden="true" /> Generar {mode === 'password' ? 'contraseña' : 'frase'}</Button>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-muted/35 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Tu resultado</h2>
          <Label htmlFor="password-result" className="mt-5">{mode === 'password' ? 'Contraseña generada' : 'Frase generada'}</Label>
          <input ref={output} id="password-result" type={shown ? 'text' : 'password'} readOnly autoComplete="off" spellCheck={false} autoCapitalize="none" data-private="true" data-1p-ignore="true" data-lpignore="true" placeholder="Genera un resultado para verlo aquí" className="mt-3 h-14 w-full min-w-0 rounded-xl border border-input bg-card px-3 font-mono text-base outline-none placeholder:font-sans placeholder:text-sm placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50" aria-describedby="password-session-help" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" className="min-h-10" variant="outline" disabled={!hasResult} onClick={() => setShown((visible) => !visible)} aria-pressed={shown}>{shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}{shown ? 'Ocultar' : 'Mostrar'}</Button>
            <Button type="button" className="min-h-10" variant="secondary" disabled={!hasResult || copying} onClick={() => void copy()}><Copy className="size-4" aria-hidden="true" />{copying ? 'Copiando…' : 'Copiar'}</Button>
            <Button type="button" className="min-h-10" variant="outline" disabled={!hasResult || Boolean(optionsError)} onClick={generate}><RefreshCw className="size-4" aria-hidden="true" /> Regenerar</Button>
            <Button type="button" className="min-h-10" variant="ghost" onClick={clear}><Trash2 className="size-4" aria-hidden="true" /> Limpiar sesión</Button>
          </div>
          <output aria-live="polite" className="mt-5 block text-sm leading-6 text-muted-foreground">{status}</output>
          {error ? <p role="alert" className="mt-3 text-sm leading-6 text-destructive">{error}</p> : null}
          <p id="password-session-help" className="mt-5 text-sm leading-6 text-muted-foreground">Solo se mantiene el resultado actual en memoria. Cambiar opciones, limpiar o salir elimina el resultado de la herramienta. El portapapeles y su historial dependen de tu sistema: bórralos allí si lo necesitas.</p>
        </div>
      </div>

      <p className="mt-6 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">La generación usa la fuente criptográfica del navegador. Usa un resultado distinto para cada cuenta y guárdalo donde puedas recuperarlo. La protección también depende del servicio de destino y de cómo lo uses.</p>
    </section>
  );
}
