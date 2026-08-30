'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Cookie, Settings2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ConsentPreference = 'essential' | 'all' | null;

type ConsentContextValue = {
  preference: ConsentPreference;
  openPreferences: () => void;
};

const storageKey = 'herramientas-consent-v1';
const consentEvent = 'herramientas-consent-change';
const ConsentContext = createContext<ConsentContextValue>({ preference: null, openPreferences: () => undefined });

function readPreference(): ConsentPreference {
  const stored = window.localStorage.getItem(storageKey);
  return stored === 'all' || stored === 'essential' ? stored : null;
}

function subscribePreference(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(consentEvent, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(consentEvent, callback);
  };
}

function subscribeHydration() {
  return () => undefined;
}

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
  const preference = useSyncExternalStore(subscribePreference, readPreference, () => null);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);

  useEffect(() => {
    if (preference !== 'all') return;
    const analyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;
    const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
    if (analyticsToken) {
      appendExternalScript(
        'cloudflare-web-analytics',
        'https://static.cloudflareinsights.com/beacon.min.js',
        { defer: '', 'data-cf-beacon': JSON.stringify({ token: analyticsToken }) },
      );
    }
    if (adsenseClientId) {
      appendExternalScript(
        'google-adsense',
        `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClientId)}`,
        { crossorigin: 'anonymous' },
      );
    }
  }, [preference]);

  function choose(next: Exclude<ConsentPreference, null>) {
    window.localStorage.setItem(storageKey, next);
    window.dispatchEvent(new Event(consentEvent));
  }

  const openPreferences = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    window.location.reload();
  }, []);

  const value = useMemo(() => ({ preference, openPreferences }), [openPreferences, preference]);

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {hydrated && preference === null ? (
        <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl bg-card p-4 shadow-[0_24px_80px_color-mix(in_oklch,var(--foreground)_20%,transparent)] ring-1 ring-foreground/15 sm:p-5" aria-label="Preferencias de privacidad">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <Cookie className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold tracking-tight">Tú decides sobre la medición y la publicidad</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Las herramientas funcionan sin cookies publicitarias. Solo activaremos medición y anuncios cuando los aceptes.{' '}
                <Link href="/privacidad" className="font-medium text-foreground underline underline-offset-3">Más información</Link>
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="rounded-xl" onClick={() => choose('essential')}>
                <ShieldCheck aria-hidden="true" /> Solo necesarias
              </Button>
              <Button className="rounded-xl" onClick={() => choose('all')}>
                Aceptar opcionales
              </Button>
            </div>
          </div>
        </aside>
      ) : null}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}

export function ConsentPreferencesButton() {
  const { openPreferences } = useConsent();
  return (
    <Button variant="outline" className="rounded-xl" onClick={openPreferences}>
      <Settings2 aria-hidden="true" /> Revisar preferencias
    </Button>
  );
}
