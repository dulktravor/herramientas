import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { BrandLogo } from '@/components/brand-logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/60 px-5 py-10 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <BrandLogo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Utilidades privadas para resolver tareas con archivos directamente en tu navegador.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground" aria-label="Información del sitio">
          <Link href="/#herramientas" className="inline-flex items-center gap-1 hover:text-foreground">Herramientas <ArrowUpRight className="size-3" aria-hidden="true" /></Link>
          <Link href="/acerca-de" className="hover:text-foreground">Acerca de</Link>
          <Link href="/privacidad" className="hover:text-foreground">Privacidad</Link>
          <Link href="/terminos" className="hover:text-foreground">Términos</Link>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 CeroNube.</p>
        <p>Resuelve aquí. No subas nada.</p>
      </div>
    </footer>
  );
}
