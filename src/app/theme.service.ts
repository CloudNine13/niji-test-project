import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light');

  constructor() {
    this.apply(this.theme());
    effect(() => this.apply(this.theme()));
  }

  toggle(): void {
    this.theme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }

  private apply(theme: Theme): void {
    const root = document.documentElement;
    root.style.colorScheme = theme;
    root.setAttribute('data-theme', theme);
  }
}
