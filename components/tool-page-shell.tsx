import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, MonitorCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { AdSlot } from '@/components/ad-slot';
import { BrandLogo } from '@/components/brand-logo';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';

type ToolPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ToolPageShell({ title, description, children }: ToolPageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Navegación de herramienta">
          <BrandLogo />
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/#herramientas" aria-label="Volver a explorar" className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'size-9 px-0 sm:h-9 sm:w-auto sm:px-2.5' })}>
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              <span className="hidden sm:inline">Volver a explorar</span>
            </Link>
          </div>
        </nav>
      </header>

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        <div className="brand-grid pointer-events-none absolute right-8 top-10 hidden size-28 rounded-3xl opacity-45 md:block" aria-hidden="true" />
        <Badge variant="secondary" className="mb-5 h-7 gap-1.5 border border-primary/10 px-3">
          <MonitorCheck aria-hidden="true" />
          Procesado en este dispositivo
        </Badge>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        <div className="relative mt-10">{children}</div>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_TOOL_SLOT} placement="tool" />
      </div>
      <SiteFooter />
    </main>
  );
}
