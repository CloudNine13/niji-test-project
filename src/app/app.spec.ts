import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the title in the current language and switches it on toggle', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const heading = root.querySelector('h1') as HTMLHeadingElement;
    const toggle = root.querySelector('.app-lang') as HTMLButtonElement;

    expect(heading.textContent?.trim()).toBe('Hunt the Wumpus');
    expect(toggle.textContent?.trim()).toBe('EN');

    toggle.click();
    fixture.detectChanges();

    expect(heading.textContent?.trim()).toBe('Caza al Wumpus');
    expect(toggle.textContent?.trim()).toBe('ES');
  });

  it('toggles the theme through a translated header button', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const themeButton = root.querySelector('.app-theme') as HTMLButtonElement;

    expect(themeButton.getAttribute('aria-label')).toBe('Switch to dark theme');
    expect(document.documentElement.style.colorScheme).toBe('light');

    themeButton.click();
    fixture.detectChanges();

    expect(themeButton.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
