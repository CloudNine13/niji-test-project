import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const mockScheme = (dark: boolean): void => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: dark } as MediaQueryList);
  };

  const root = (): HTMLElement => document.documentElement;

  afterEach(() => {
    root().removeAttribute('data-theme');
    root().style.colorScheme = '';
  });

  it('defaults to dark when the OS prefers a dark scheme', () => {
    mockScheme(true);

    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('defaults to light when the OS does not prefer a dark scheme', () => {
    mockScheme(false);

    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('toggles the signal and the document root color scheme', () => {
    mockScheme(false);
    const service = TestBed.inject(ThemeService);

    expect(root().style.colorScheme).toBe('light');
    expect(root().getAttribute('data-theme')).toBe('light');

    service.toggle();
    TestBed.tick();

    expect(service.theme()).toBe('dark');
    expect(root().style.colorScheme).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');

    service.toggle();
    TestBed.tick();

    expect(service.theme()).toBe('light');
    expect(root().style.colorScheme).toBe('light');
    expect(root().getAttribute('data-theme')).toBe('light');
  });
});
