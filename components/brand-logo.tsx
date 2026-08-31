import Link from 'next/link';

import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  decorative?: boolean;
};

export function BrandMark({ className, decorative = true }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden={decorative ? 'true' : undefined}
      role={decorative ? undefined : 'img'}
    >
      {!decorative ? <title>Símbolo de CeroNube</title> : null}
      <rect width="48" height="48" rx="15" fill="#083F43" />
      <path
        d="M16.5 12.5h15a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5h-15a5 5 0 0 1-5-5v-13a5 5 0 0 1 5-5Z"
        stroke="#F4EAD7"
        strokeWidth="4"
      />
      <circle cx="17" cy="18" r="1.6" fill="#FF8A3D" />
      <circle cx="22" cy="18" r="1.6" fill="#1EC8C8" />
      <circle cx="27" cy="18" r="1.6" fill="#F4EAD7" />
      <path d="M20 23.5h7l4 4v8H20v-12Z" fill="#1EC8C8" />
      <path d="M27 23.5v4h4" stroke="#F4EAD7" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 27h8M6 31h10" stroke="#FF8A3D" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  compact?: boolean;
};

export function BrandLogo({ className, markClassName, compact = false }: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn('group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50', className)}
      aria-label="CeroNube, inicio"
    >
      <BrandMark className={cn('size-9 transition-transform duration-200 group-hover:-rotate-3', markClassName)} />
      {!compact ? (
        <span className="text-[1.05rem] font-bold tracking-[-0.035em] text-foreground">
          Cero<span className="text-primary">Nube</span>
        </span>
      ) : null}
    </Link>
  );
}
