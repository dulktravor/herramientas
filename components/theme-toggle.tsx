'use client';

import { MoonStar, SunMedium } from 'lucide-react';

import { Button } from '@/components/ui/button';

const themeStorageKey = 'ceronube-theme';

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const useDarkTheme = !root.classList.contains('dark');

    root.classList.toggle('dark', useDarkTheme);
    root.style.colorScheme = useDarkTheme ? 'dark' : 'light';
    window.localStorage.setItem(themeStorageKey, useDarkTheme ? 'dark' : 'light');
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className="rounded-xl bg-card/70 shadow-sm backdrop-blur"
      onClick={toggleTheme}
      aria-label="Cambiar entre modo claro y oscuro"
      title="Cambiar tema"
    >
      <MoonStar className="size-4 dark:hidden" aria-hidden="true" />
      <SunMedium className="hidden size-4 dark:block" aria-hidden="true" />
      <span className="sr-only">Cambiar entre modo claro y oscuro</span>
    </Button>
  );
}
