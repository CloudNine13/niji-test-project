import { I18nService } from './i18n.service';
import { en, type TranslationKey } from './en';
import { es } from './es';

const serviceWithLocale = (locale: string): I18nService => {
  spyOnProperty(navigator, 'language', 'get').and.returnValue(locale);
  return new I18nService();
};

const placeholdersOf = (template: string): string[] =>
  [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

describe('I18nService', () => {
  it('detects Spanish from a Spanish browser locale', () => {
    expect(serviceWithLocale('es-ES').lang()).toBe('es');
  });

  it('falls back to English for any non-Spanish locale', () => {
    let locale = 'en-US';
    spyOnProperty(navigator, 'language', 'get').and.callFake(() => locale);

    expect(new I18nService().lang()).toBe('en');

    locale = 'fr-FR';
    expect(new I18nService().lang()).toBe('en');
  });

  it('toggles between English and Spanish', () => {
    const service = serviceWithLocale('en-US');

    service.toggle();
    expect(service.lang()).toBe('es');

    service.toggle();
    expect(service.lang()).toBe('en');
  });

  it('tracks the active language when translating', () => {
    const service = serviceWithLocale('en-US');
    expect(service.t('game.advance')).toBe('Advance');

    service.lang.set('es');
    expect(service.t('game.advance')).toBe('Avanzar');
  });

  it('interpolates parameters', () => {
    const service = serviceWithLocale('en-US');
    expect(service.t('log.moved', { row: 2, col: 3 })).toBe('Moved to (2,3).');

    service.lang.set('es');
    expect(service.t('log.moved', { row: 2, col: 3 })).toBe('Te moviste a (2,3).');
  });

  it('falls back to English when the active dictionary lacks the key', () => {
    const service = serviceWithLocale('es-ES');
    const spanish = es as unknown as Record<string, string>;
    const original = spanish['setup.pits'];
    delete spanish['setup.pits'];

    try {
      expect(service.t('setup.pits')).toBe(en['setup.pits']);
    } finally {
      spanish['setup.pits'] = original;
    }
  });

  it('keeps the English and Spanish key sets identical', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('keeps the placeholder set identical across languages for every key', () => {
    const keys = Object.keys(en) as TranslationKey[];

    for (const key of keys) {
      expect(placeholdersOf(es[key])).withContext(key).toEqual(placeholdersOf(en[key]));
    }
  });
});
