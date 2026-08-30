'use client';

import { useEffect, useRef } from 'react';

import { useConsent } from '@/components/consent-provider';

type AdSlotProps = {
  slot?: string;
  placement: 'home' | 'tool';
};

export function AdSlot({ slot, placement }: AdSlotProps) {
  const { preference } = useConsent();
  const initialized = useRef(false);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const enabled = preference === 'all' && Boolean(client && slot);

  useEffect(() => {
    if (!enabled || initialized.current) return;
    initialized.current = true;
    try {
      const adWindow = window as Window & { adsbygoogle?: unknown[] };
      (adWindow.adsbygoogle ??= []).push({});
    } catch {
      initialized.current = false;
    }
  }, [enabled]);

  if (!enabled || !client || !slot) return null;

  return (
    <aside
      className={placement === 'home'
        ? 'mx-auto my-14 w-full max-w-5xl border-y border-border/70 py-4 text-center'
        : 'mx-auto mt-16 w-full max-w-4xl border-t border-border/70 pt-5 text-center'}
      aria-label="Publicidad"
    >
      <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Publicidad</p>
      <ins
        className="adsbygoogle block min-h-24 w-full"
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="horizontal"
        data-full-width-responsive="false"
      />
    </aside>
  );
}
