import { Injectable, signal, type WritableSignal } from '@angular/core';
import { en, type TranslationKey } from './en';
import { es } from './es';

export type Language = 'en' | 'es';

export type TranslationParams = Record<string, string | number>;

const dictionaries: Record<Language, Record<string, string>> = { en, es };

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang: WritableSignal<Language>;

  constructor() {
    this.lang = signal<Language>(navigator.language.startsWith('es') ? 'es' : 'en');
  }

  toggle(): void {
    this.lang.update((current) => (current === 'en' ? 'es' : 'en'));
  }

  t(key: TranslationKey, params: TranslationParams = {}): string {
    const template = dictionaries[this.lang()][key] ?? en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      name in params ? String(params[name]) : placeholder,
    );
  }
}
