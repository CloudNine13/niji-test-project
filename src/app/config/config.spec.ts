import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../app.routes';
import { GameSessionService } from '../game-session.service';
import { Config } from './config';

describe('Config', () => {
  const create = () => {
    const fixture = TestBed.createComponent(Config);
    fixture.detectChanges();
    const selects = fixture.nativeElement.querySelectorAll(
      'select',
    ) as NodeListOf<HTMLSelectElement>;
    const select = (index: number, value: string) => {
      selects[index].value = value;
      selects[index].dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const options = (index: number) => selects[index].options.length;
    return { fixture, selects, select, options };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('starts from the documented defaults', () => {
    const { selects, options } = create();

    expect(selects[0].value).toBe('4');
    expect(selects[1].value).toBe('2');
    expect(selects[2].value).toBe('1');
    expect(options(0)).toBe(7);
    expect(options(1)).toBe(11);
    expect(options(2)).toBe(11);
  });

  it('regenerates the pit options when the board size changes and clamps the selection', () => {
    const { selects, select, options } = create();

    select(0, '10');
    expect(options(1)).toBe(95);

    select(1, '94');
    expect(selects[1].value).toBe('94');

    select(0, '4');
    expect(options(1)).toBe(11);
    expect(selects[1].value).toBe('10');
  });

  it('starts a session from the selected values and opens the game route', async () => {
    const { fixture, select } = create();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    select(0, '6');
    select(1, '5');
    select(2, '3');
    button.click();
    await fixture.whenStable();

    const session = TestBed.inject(GameSessionService);
    expect(session.config()).toEqual({ size: 6, pits: 5, arrows: 3 });
    expect(session.engine()?.size).toBe(6);
    expect(session.engine()?.arrowsLeft).toBe(3);
    expect(TestBed.inject(Router).url).toBe('/game');
  });

  it('pre-selects the stored configuration of the previous game', () => {
    TestBed.inject(GameSessionService).config.set({ size: 8, pits: 40, arrows: 4 });

    const { selects, options } = create();

    expect(selects[0].value).toBe('8');
    expect(selects[1].value).toBe('40');
    expect(selects[2].value).toBe('4');
    expect(options(1)).toBe(59);
  });
});
