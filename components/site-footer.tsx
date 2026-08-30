import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <span className="font-medium">Herramientas</span>
        </Link>
        <p>Utilidades rápidas y privadas para tus archivos.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Información del sitio">
          <Link href="/acerca-de" className="hover:text-foreground">Acerca de</Link>
          <Link href="/privacidad" className="hover:text-foreground">Privacidad</Link>
          <Link href="/terminos" className="hover:text-foreground">Términos</Link>
        </nav>
      </div>
    </footer>
  );
}
