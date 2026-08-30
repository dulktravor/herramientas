import type { Metadata } from 'next';
import { Gauge, LockKeyhole, Workflow } from 'lucide-react';

import { ContentPageShell } from '@/components/content-page-shell';

export const metadata: Metadata = {
  title: 'Acerca de',
  description: 'Principios de diseño y privacidad detrás de la colección Herramientas.',
  alternates: { canonical: '/acerca-de' },
};

const principles = [
  { title: 'Primero la tarea', description: 'Cada página empieza por la herramienta y evita pasos artificiales.', icon: Workflow },
  { title: 'Privacidad visible', description: 'Indicamos cuándo un proceso ocurre localmente y qué servicios son opcionales.', icon: LockKeyhole },
  { title: 'Ligero y comprensible', description: 'Opciones concretas, resultados inmediatos y diseño adaptable.', icon: Gauge },
];

export default function AboutPage() {
  return (
    <ContentPageShell
      eyebrow="El proyecto"
      title="Utilidades que respetan tu tiempo y tus archivos"
      description="Herramientas es una colección en crecimiento de pequeñas aplicaciones para resolver tareas habituales sin cuentas obligatorias ni flujos innecesarios."
    >
      <section>
        <h2>Por qué existe</h2>
        <p>Muchas tareas sencillas terminan repartidas entre páginas cargadas de ventanas emergentes, límites poco claros y formularios de registro. Este proyecto reúne esas tareas en una experiencia coherente y explica qué ocurre con cada archivo.</p>
      </section>
      <section>
        <h2>Principios del producto</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <article key={principle.title} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-sm font-semibold text-foreground">{principle.title}</h3>
                <p className="mt-2 text-sm leading-6">{principle.description}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section>
        <h2>Cómo se sostiene</h2>
        <p>La intención es financiar el alojamiento y el desarrollo con espacios publicitarios discretos, colocados después del contenido principal y nunca sobre los controles de una herramienta. La publicidad permanece desactivada hasta que exista una configuración real y el visitante acepte las tecnologías opcionales.</p>
      </section>
    </ContentPageShell>
  );
}
