import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../app.routes';
import { GameSessionService } from '../game-session.service';
import { configFor, type ScriptedBoard, scriptedRng } from '../game-engine/testing/engine-fixtures';
import { Game } from './game';

const WIN_BOARD: ScriptedBoard = {
  size: 4,
  facing: 'S',
  start: 0,
  exit: 15,
  wumpus: 12,
  gold: 5,
  pits: [1],
};

const DEATH_BOARD: ScriptedBoard = {
  size: 4,
  facing: 'E',
  start: 0,
  exit: 15,
  wumpus: 12,
  gold: 5,
  pits: [1],
};

const BREEZE_BOARD: ScriptedBoard = {
  size: 4,
  facing: 'S',
  start: 0,
  exit: 15,
  wumpus: 12,
  gold: 5,
  pits: [8],
};

const WUMPUS_IN_LINE_BOARD: ScriptedBoard = {
  size: 4,
  facing: 'E',
  start: 0,
  exit: 15,
  wumpus: 3,
  gold: 5,
  pits: [8],
};

describe('Game', () => {
  const create = (board: ScriptedBoard, arrows = 1): ComponentFixture<Game> => {
    TestBed.inject(GameSessionService).start(configFor(board, arrows, scriptedRng([board]).rng));
    const fixture = TestBed.createComponent(Game);
    fixture.detectChanges();
    return fixture;
  };

  const button = (fixture: ComponentFixture<Game>, selector: string): HTMLButtonElement =>
    fixture.nativeElement.querySelector(`.actions ${selector}`) as HTMLButtonElement;

  const click = (fixture: ComponentFixture<Game>, selectors: readonly string[]): void => {
    for (const selector of selectors) {
      button(fixture, selector).click();
    }
    fixture.detectChanges();
  };

  const logLines = (fixture: ComponentFixture<Game>): readonly string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.log-entry') as NodeListOf<HTMLElement>).map(
      (line) => line.textContent?.trim() ?? '',
    );

  const fogged = (fixture: ComponentFixture<Game>): readonly number[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.cell') as NodeListOf<HTMLElement>)
      .map((cell, index) => (cell.classList.contains('cell-fog') ? index : -1))
      .filter((index) => index >= 0);

  const fogToggle = (fixture: ComponentFixture<Game>): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.fog-toggle') as HTMLButtonElement;

  const toExitWithGold = [
    '.advance',
    '.turn-left',
    '.advance',
    '.advance',
    '.advance',
    '.turn-right',
    '.advance',
    '.advance',
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('renders the hunter with its orientation and the exit cell on the grid', () => {
    const fixture = create(WIN_BOARD);
    const cells = fixture.nativeElement.querySelectorAll('.cell') as NodeListOf<HTMLElement>;

    expect(cells.length).toBe(16);
    expect(cells[0].textContent?.trim()).toBe('S');
    expect(cells[15].textContent?.trim()).toBe('Exit');
    expect(cells[5].textContent?.trim()).toBe('');
  });

  it('logs the destination coordinates and the perceptions of the move', () => {
    const fixture = create(BREEZE_BOARD);

    click(fixture, ['.advance']);

    expect(logLines(fixture)).toEqual(['Moved to (1,0). You feel a breeze.']);
  });

  it('logs a hit as a scream and a miss as silence', () => {
    const fixture = create(WUMPUS_IN_LINE_BOARD, 2);

    click(fixture, ['.shoot', '.shoot']);

    expect(logLines(fixture)).toEqual(['Shot arrow. Scream!', 'Shot arrow. Silence.']);
  });

  it('disables the shoot button when no arrows remain', () => {
    const withoutArrows = create(WIN_BOARD, 0);
    expect(button(withoutArrows, '.shoot').disabled).toBeTrue();
    expect(button(withoutArrows, '.advance').disabled).toBeFalse();
  });

  it('enables the exit button only on the exit cell while carrying the gold', () => {
    const fixture = create(WIN_BOARD);

    expect(button(fixture, '.exit').disabled).toBeTrue();

    click(fixture, toExitWithGold);

    expect(button(fixture, '.exit').disabled).toBeFalse();
  });

  it('ends the game when the hunter advances into a pit and offers a new game', () => {
    const fixture = create(DEATH_BOARD);

    click(fixture, ['.advance']);

    expect(logLines(fixture)).toEqual(['You fell into a pit at (0,1).']);
    for (const selector of ['.advance', '.turn-left', '.turn-right', '.shoot', '.exit']) {
      expect(button(fixture, selector).disabled).toBeTrue();
    }
    expect(button(fixture, '.new-game')).toBeTruthy();
  });

  it('wins through the exit with the gold and returns to a pre-filled setup screen', async () => {
    const fixture = create(WIN_BOARD);

    click(fixture, toExitWithGold);
    click(fixture, ['.exit']);

    const lines = logLines(fixture);
    expect(lines[lines.length - 2]).toBe('You escaped through the exit.');
    expect(lines[lines.length - 1]).toMatch(
      /^You escaped with the gold in 8 actions, \d{2}:\d{2}$/,
    );
    expect(button(fixture, '.advance').disabled).toBeTrue();
    expect(button(fixture, '.new-game')).toBeTruthy();

    button(fixture, '.new-game').click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/setup');
    expect(TestBed.inject(GameSessionService).config()).toEqual(
      jasmine.objectContaining({ size: 4, pits: 1, arrows: 1 }),
    );
  });

  it('redirects to the setup screen when there is no active session', async () => {
    await TestBed.inject(Router).navigateByUrl('/game');

    expect(TestBed.inject(Router).url).toBe('/setup');
  });

  it('fogs every unvisited cell except the hunter and the exit', () => {
    const fixture = create(WIN_BOARD);
    const cells = fogged(fixture);

    expect(cells).toHaveSize(14);
    expect(cells).not.toContain(0);
    expect(cells).not.toContain(15);
  });

  it('reveals only the cells reached by an advance', () => {
    const fixture = create(WIN_BOARD);

    click(fixture, ['.advance']);
    expect(fogged(fixture)).toHaveSize(13);
    expect(fogged(fixture)).not.toContain(4);

    click(fixture, ['.advance']);
    expect(fogged(fixture)).toHaveSize(12);
    expect(fogged(fixture)).not.toContain(8);
  });

  it('keeps the fog unchanged across bumps and turns', () => {
    const fixture = create({ ...WIN_BOARD, facing: 'N' });
    const before = fogged(fixture);

    click(fixture, ['.advance', '.turn-right']);

    expect(fogged(fixture)).toEqual(before);
  });

  it('lifts the fog from every cell when the switch is off', () => {
    const fixture = create(WIN_BOARD);
    const toggle = fogToggle(fixture);

    expect(toggle.textContent?.trim()).toBe('Fog of war: on');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    fixture.detectChanges();

    expect(fogged(fixture)).toEqual([]);
    expect(toggle.textContent?.trim()).toBe('Fog of war: off');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    toggle.click();
    fixture.detectChanges();

    expect(fogged(fixture)).toHaveSize(14);
    expect(toggle.textContent?.trim()).toBe('Fog of war: on');
  });
});
