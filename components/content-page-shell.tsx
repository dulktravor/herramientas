import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { BrandLogo } from '@/components/brand-logo';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
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
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Navegación informativa">
          <BrandLogo />
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/" aria-label="Volver al inicio" className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'size-9 px-0 sm:h-9 sm:w-auto sm:px-2.5' })}>
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              <span className="hidden sm:inline">Volver al inicio</span>
            </Link>
          </div>
        </nav>
      </header>
      <div className="relative mx-auto max-w-3xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <div className="brand-grid pointer-events-none absolute right-8 top-12 size-24 rounded-3xl opacity-40" aria-hidden="true" />
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        <div className="legal-copy mt-12 space-y-10 leading-7 text-muted-foreground">{children}</div>
      </div>
      <SiteFooter />
    </main>
  );
}
