import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, LockKeyhole, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

type ToolPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ToolPageShell({ title, description, children }: ToolPageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/90">
        <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Navegación de herramienta">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span>Herramientas</span>
          </Link>
          <Link href="/#herramientas" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Volver a explorar
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        <Badge variant="secondary" className="mb-5 h-7 gap-1.5 px-3">
          <LockKeyhole aria-hidden="true" />
          Procesamiento local
        </Badge>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}
