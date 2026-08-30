import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { SiteFooter } from '@/components/site-footer';
import { buttonVariants } from '@/components/ui/button';

type ContentPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function ContentPageShell({ eyebrow, title, description, children }: ContentPageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/90">
        <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Navegación informativa">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span>Herramientas</span>
          </Link>
          <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" /> Volver al inicio
          </Link>
        </nav>
      </header>
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        <div className="legal-copy mt-12 space-y-10 leading-7 text-muted-foreground">{children}</div>
      </div>
      <SiteFooter />
    </main>
  );
}
