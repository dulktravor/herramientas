import {
  ArrowDown,
  CheckCircle2,
  Download,
  LockKeyhole,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRoundX,
  Zap,
} from 'lucide-react';

import { ToolDirectory } from '@/components/tool-directory';
import { buttonVariants } from '@/components/ui/button';

const trustPoints = [
  {
    title: 'Privacidad por defecto',
    description: 'Priorizamos el procesamiento local para que tus archivos permanezcan en tu dispositivo.',
    icon: LockKeyhole,
  },
  {
    title: 'Sin cuentas innecesarias',
    description: 'Las herramientas esenciales estarán disponibles sin registro obligatorio.',
    icon: UserRoundX,
  },
  {
    title: 'Resultados inmediatos',
    description: 'Flujos breves, opciones comprensibles y descargas sin pasos artificiales.',
    icon: Zap,
  },
];

const steps = [
  {
    number: '01',
    title: 'Elige tus archivos',
    description: 'Arrástralos o selecciónalos desde tu dispositivo.',
    icon: Upload,
  },
  {
    number: '02',
    title: 'Ajusta el resultado',
    description: 'Configura solamente las opciones que realmente importan.',
    icon: MousePointer2,
  },
  {
    number: '03',
    title: 'Descarga',
    description: 'Obtén el archivo final directamente, sin esperas.',
    icon: Download,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <a href="#inicio" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span>Herramientas</span>
          </a>

          <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#herramientas">Explorar</a>
            <a className="transition-colors hover:text-foreground" href="#como-funciona">Cómo funciona</a>
            <a className="transition-colors hover:text-foreground" href="#privacidad">Privacidad</a>
          </div>

          <a
            href="#herramientas"
            className={buttonVariants({ size: 'lg', className: 'rounded-xl px-4' })}
          >
            Explorar
            <ArrowDown data-icon="inline-end" aria-hidden="true" />
          </a>
        </nav>
      </header>

      <section id="inicio" className="relative px-5 pb-12 pt-18 sm:px-8 sm:pb-16 sm:pt-24">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Procesamiento privado en tu navegador
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">
            Resuelve tareas con archivos, sin complicarte.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
            Herramientas rápidas para imágenes, PDF y datos. Sin registro, sin esperas y, siempre que sea posible, sin subir tus archivos.
          </p>
        </div>
      </section>

      <section id="herramientas" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 sm:px-8">
        <ToolDirectory />
      </section>

      <section id="privacidad" className="scroll-mt-24 border-y border-border bg-secondary/45 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-medium text-primary">Nuestro compromiso</p>
              <h2 className="mt-2 max-w-md text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Útil por diseño. Privado por defecto.
              </h2>
              <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
                Cada herramienta explicará claramente dónde se procesa el archivo y qué sucede con tus datos.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {trustPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <article key={point.title} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                    <h3 className="mt-5 font-semibold tracking-tight">{point.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{point.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-primary">Un flujo sencillo</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">De archivo original a resultado en tres pasos.</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.number} className="relative border-t border-border pt-6">
                <span className="font-mono text-xs text-muted-foreground">{step.number}</span>
                <div className="mt-10 flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium opacity-80">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Base preparada para crecer
              </p>
              <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.035em]">
                Imágenes, PDF y datos serán solo el comienzo.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 opacity-75">
                Las próximas herramientas se incorporarán a la misma experiencia, sin convertir el sitio en un catálogo desordenado.
              </p>
            </div>
            <a
              href="#herramientas"
              className={buttonVariants({
                size: 'lg',
                variant: 'secondary',
                className: 'h-11 rounded-xl px-5',
              })}
            >
              Ver colección inicial
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <span className="font-medium">Herramientas</span>
          </div>
          <p>Utilidades rápidas y privadas para tus archivos.</p>
          <div className="flex gap-5">
            <a href="#privacidad" className="hover:text-foreground">Privacidad</a>
            <a href="#como-funciona" className="hover:text-foreground">Cómo funciona</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
