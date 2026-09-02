import {
  ArrowDown,
  CheckCircle2,
  Download,
  LockKeyhole,
  MousePointer2,
  ShieldCheck,
  Upload,
  UserRoundX,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { AdSlot } from '@/components/ad-slot';
import { BrandLogo } from '@/components/brand-logo';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { ToolDirectory } from '@/components/tool-directory';
import { buttonVariants } from '@/components/ui/button';
import {
  absoluteUrl,
  publicTools,
  siteDescription,
  siteName,
} from '@/lib/site';

const trustPoints = [
  {
    title: 'El archivo no viaja',
    description:
      'El trabajo ocurre en la memoria de tu navegador, dentro de tu dispositivo.',
    icon: LockKeyhole,
  },
  {
    title: 'Cero cuentas',
    description:
      'Abre una herramienta, termina la tarea y descarga. No necesitas registrarte.',
    icon: UserRoundX,
  },
  {
    title: 'Directo al resultado',
    description:
      'Opciones comprensibles, flujos breves y descargas sin pasos artificiales.',
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
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: absoluteUrl('/'),
      description: siteDescription,
      inLanguage: 'es',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Herramientas disponibles',
      numberOfItems: publicTools.length,
      itemListElement: publicTools.map((tool, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: tool.name,
        url: absoluteUrl(tool.path),
      })),
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <BrandLogo />

          <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a
              className="transition-colors hover:text-foreground"
              href="#herramientas"
            >
              Explorar
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#como-funciona"
            >
              Cómo funciona
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#privacidad"
            >
              Privacidad
            </a>
            <Link
              className="transition-colors hover:text-foreground"
              href="/acerca-de"
            >
              Acerca de
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href="#herramientas"
              aria-label="Abrir herramientas"
              className={buttonVariants({
                size: 'lg',
                className: 'size-9 rounded-xl p-0 sm:h-9 sm:w-auto sm:px-4',
              })}
            >
              <span className="hidden sm:inline">Abrir herramientas</span>
              <ArrowDown data-icon="inline-end" aria-hidden="true" />
            </a>
          </div>
        </nav>
      </header>

      <section
        id="inicio"
        className="relative px-5 pb-12 pt-18 sm:px-8 sm:pb-16 sm:pt-24"
      >
        <div className="hero-glow" aria-hidden="true" />
        <div
          className="brand-grid absolute right-[6%] top-10 hidden size-36 rounded-[2.5rem] opacity-60 lg:block"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Tus archivos trabajan aquí, no en la nube
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">
            Resuelve aquí. <span className="text-primary">No subas nada.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
            Utilidades rápidas para imágenes, PDF, audio, vídeo, ZIP y datos que
            procesan tus archivos directamente en el navegador. Sin registro,
            sin esperas y con privacidad por diseño.
          </p>
          <div className="mx-auto mt-10 grid max-w-xl grid-cols-3 overflow-hidden rounded-2xl border border-border bg-card/75 text-left shadow-sm backdrop-blur">
            <div className="p-4 sm:p-5">
              <p className="text-2xl font-bold tracking-[-0.04em] text-foreground">
                10
              </p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                utilidades
              </p>
            </div>
            <div className="border-x border-border p-4 sm:p-5">
              <p className="text-2xl font-bold tracking-[-0.04em] text-foreground">
                0
              </p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                cuentas
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-2xl font-bold tracking-[-0.04em] text-primary">
                Local
              </p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                por defecto
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="herramientas"
        className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 sm:px-8"
      >
        <ToolDirectory />
        <AdSlot
          slot={process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT}
          placement="home"
        />
      </section>

      <section
        id="privacidad"
        className="scroll-mt-24 bg-[#083f43] px-5 py-20 text-[#f4ead7] dark:bg-[#0f141b] sm:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-medium text-[#4fe0d6]">
                La promesa CeroNube
              </p>
              <h2 className="mt-2 max-w-md text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Útil por diseño. Privado por defecto.
              </h2>
              <p className="mt-4 max-w-lg leading-7 text-[#bed5cf]">
                Cada herramienta explica dónde ocurre el proceso. Tus imágenes,
                documentos y datos no se almacenan en una base del sitio.
              </p>
              <Link
                href="/privacidad"
                className="mt-5 inline-flex text-sm font-medium text-[#4fe0d6] underline decoration-[#4fe0d6]/50 underline-offset-4 hover:decoration-[#4fe0d6]"
              >
                Ver cómo protegemos tus archivos
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {trustPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <article
                    key={point.title}
                    className="rounded-2xl bg-[#0d4c4f] p-5 ring-1 ring-white/10 dark:bg-[#181f28]"
                  >
                    <Icon
                      className="size-5 text-[#4fe0d6]"
                      aria-hidden="true"
                    />
                    <h3 className="mt-5 font-semibold tracking-tight">
                      {point.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#bed5cf]">
                      {point.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        id="como-funciona"
        className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8"
      >
        <div className="max-w-xl">
          <p className="text-sm font-medium text-primary">Un flujo sencillo</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            De archivo original a resultado en tres pasos.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.number}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <span className="font-mono text-xs font-medium text-primary">
                  PASO {step.number}
                </span>
                <div className="mt-8 flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary ring-1 ring-primary/10">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#083f43] px-6 py-10 text-[#f4ead7] shadow-[0_26px_70px_color-mix(in_oklch,#083f43_22%,transparent)] dark:bg-[#11171e] dark:shadow-black/30 sm:px-10 sm:py-12">
          <div
            className="brand-grid absolute -right-8 -top-8 size-48 rounded-full opacity-35"
            aria-hidden="true"
          />
          <span
            className="absolute bottom-8 right-12 hidden size-4 rounded-full bg-[#ff8a3d] sm:block"
            aria-hidden="true"
          />
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-[#4fe0d6]">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Diez herramientas disponibles
              </p>
              <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.035em]">
                Todo lo necesario para resolver el archivo y seguir con tu día.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-[#bed5cf]">
                CeroNube crecerá con el mismo criterio: procesos locales,
                opciones comprensibles y resultados listos para descargar.
              </p>
            </div>
            <a
              href="#herramientas"
              className={buttonVariants({
                size: 'lg',
                variant: 'secondary',
                className:
                  'h-11 rounded-xl bg-[#f4ead7] px-5 text-[#083f43] hover:bg-white',
              })}
            >
              Elegir una herramienta
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
