'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { BarChart3, Cookie, Megaphone, Settings2, ShieldCheck, Sparkles } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export type ConsentSettings = { advertising: boolean; personalizedAdvertising: boolean; analytics: boolean };
type ConsentContextValue = { hasDecision: boolean; settings: ConsentSettings; openPreferences: () => void; saveSettings: (settings: ConsentSettings) => void };

const storageKey = 'herramientas-consent-v2';
const legacyStorageKey = 'herramientas-consent-v1';
const consentEvent = 'herramientas-consent-change';
const necessarySettings: ConsentSettings = { advertising: false, personalizedAdvertising: false, analytics: false };
const acceptedSettings: ConsentSettings = { advertising: true, personalizedAdvertising: true, analytics: true };
const ConsentContext = createContext<ConsentContextValue>({ hasDecision: false, settings: necessarySettings, openPreferences: () => undefined, saveSettings: () => undefined });

function readStoredConsent() {
  return window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey);
}

function parseConsent(stored: string | null): { hasDecision: boolean; settings: ConsentSettings } {
  if (stored === 'all') return { hasDecision: true, settings: acceptedSettings };
  if (stored === 'essential') return { hasDecision: true, settings: necessarySettings };
  if (!stored) return { hasDecision: false, settings: necessarySettings };
  try {
    const parsed = JSON.parse(stored) as Partial<ConsentSettings>;
    const advertising = parsed.advertising === true;
    return { hasDecision: true, settings: { advertising, personalizedAdvertising: advertising && parsed.personalizedAdvertising === true, analytics: parsed.analytics === true } };
  } catch {
    return { hasDecision: false, settings: necessarySettings };
  }
}

function subscribeConsent(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(consentEvent, callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(consentEvent, callback); };
}

function subscribeHydration() { return () => undefined; }

function appendExternalScript(id: string, src: string, attributes: Record<string, string> = {}) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  Object.entries(attributes).forEach(([name, value]) => script.setAttribute(name, value));
  document.head.appendChild(script);
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const storedConsent = useSyncExternalStore(subscribeConsent, readStoredConsent, () => null);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const consent = useMemo(() => parseConsent(storedConsent), [storedConsent]);

  useEffect(() => {
    const analyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;
    const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
    if (consent.settings.analytics && analyticsToken) {
      appendExternalScript('cloudflare-web-analytics', 'https://static.cloudflareinsights.com/beacon.min.js', { defer: '', 'data-cf-beacon': JSON.stringify({ token: analyticsToken }) });
    }
    if (consent.settings.advertising && adsenseClientId) {
      const adWindow = window as Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
      const queue = (adWindow.adsbygoogle ??= []);
      queue.requestNonPersonalizedAds = consent.settings.personalizedAdvertising ? 0 : 1;
      appendExternalScript('google-adsense', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClientId)}`, { crossorigin: 'anonymous' });
    }
  }, [consent.settings]);

  const saveSettings = useCallback((next: ConsentSettings) => {
    const normalized = { ...next, personalizedAdvertising: next.advertising && next.personalizedAdvertising };
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
    window.localStorage.removeItem(legacyStorageKey);
    window.dispatchEvent(new Event(consentEvent));
  }, []);
  const openPreferences = useCallback(() => { document.getElementById('preferencias-publicidad')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []);
  const value = useMemo(() => ({ ...consent, openPreferences, saveSettings }), [consent, openPreferences, saveSettings]);

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {hydrated && !consent.hasDecision ? (
        <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl bg-card p-4 shadow-[0_24px_80px_color-mix(in_oklch,var(--foreground)_20%,transparent)] ring-1 ring-foreground/15 sm:p-5" aria-label="Preferencias de privacidad">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Cookie className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold tracking-tight">Tú decides sobre la medición y la publicidad</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Puedes aceptar todo, continuar sin servicios opcionales o configurar cada finalidad. <Link href="/privacidad" className="font-medium text-foreground underline underline-offset-3">Más información</Link></p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => saveSettings(necessarySettings)}><ShieldCheck aria-hidden="true" /> Solo necesarias</Button>
              <Link href="/privacidad#preferencias-publicidad" className={buttonVariants({ variant: 'outline', className: 'rounded-xl' })}><Settings2 aria-hidden="true" /> Configurar</Link>
              <Button className="rounded-xl" onClick={() => saveSettings(acceptedSettings)}>Aceptar todo</Button>
            </div>
          </div>
        </aside>
      ) : null}
    </ConsentContext.Provider>
  );
}

export function useConsent() { return useContext(ConsentContext); }

export function ConsentPreferences() {
  const { hasDecision, settings, saveSettings } = useConsent();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  function update<K extends keyof ConsentSettings>(key: K, value: ConsentSettings[K]) {
    setSaved(false);
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'advertising' && value === false) next.personalizedAdvertising = false;
      if (key === 'personalizedAdvertising' && value === true) next.advertising = true;
      return next;
    });
  }

  const choices = [
    { key: 'advertising' as const, icon: Megaphone, title: 'Anuncios contextuales', description: 'Permite mostrar anuncios relacionados con la página actual. No necesitan basarse en tu historial de navegación.' },
    { key: 'personalizedAdvertising' as const, icon: Sparkles, title: 'Personalización publicitaria', description: 'Permite que Google y sus socios adapten los anuncios según intereses y otras señales autorizadas.', disabled: !draft.advertising },
    { key: 'analytics' as const, icon: BarChart3, title: 'Medición de uso', description: 'Permite estadísticas agregadas para entender qué herramientas son más útiles y mejorar el sitio.' },
  ];

  return (
    <div id="preferencias-publicidad" className="not-prose scroll-mt-24 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-5"><p className="text-sm font-medium text-primary">Centro de preferencias</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Configura tu experiencia</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Las funciones esenciales y el procesamiento local de archivos permanecen siempre activos.</p></div>
      <div className="divide-y divide-border rounded-xl border border-border">
        {choices.map(({ key, icon: Icon, title, description, disabled }) => (
          <div key={key} className="flex gap-4 p-4">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-4" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><label htmlFor={`consent-${key}`} className="font-medium text-foreground">{title}</label><p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p></div>
            <Switch id={`consent-${key}`} checked={draft[key]} disabled={disabled} onCheckedChange={(checked) => update(key, checked)} aria-label={title} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button className="rounded-xl" onClick={() => { saveSettings(draft); setSaved(true); }}>Guardar preferencias</Button>
        <Button variant="outline" className="rounded-xl" onClick={() => { setDraft(necessarySettings); setSaved(false); }}>Desactivar opcionales</Button>
        <p className="text-sm text-muted-foreground" aria-live="polite">{saved ? 'Preferencias guardadas.' : hasDecision ? 'Modifica las opciones y guarda los cambios.' : 'Aún no has guardado una elección.'}</p>
      </div>
    </div>
  );
}

export function ConsentPreferencesButton() {
  return <Link href="/privacidad#preferencias-publicidad" className={buttonVariants({ variant: 'outline', className: 'rounded-xl' })}><Settings2 aria-hidden="true" /> Revisar preferencias</Link>;
}
