import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
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
});
