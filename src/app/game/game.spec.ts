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

  it('renders the hunter arrow, the exit image, and no hazard images on the grid', () => {
    const fixture = create(WIN_BOARD);
    const cells = fixture.nativeElement.querySelectorAll('.cell') as NodeListOf<HTMLElement>;

    expect(cells.length).toBe(16);
    expect(cells[0].querySelector('.icon-hunter')).not.toBeNull();
    expect(cells[0].textContent?.trim()).toBe('');
    expect(cells[15].querySelector('.icon-exit')?.getAttribute('aria-label')).toBe('Exit');
    expect(cells[5].children.length).toBe(0);
  });

  it('rotates the hunter arrow to the facing direction', () => {
    const fixture = create(WIN_BOARD);
    const hunter = (): HTMLElement =>
      fixture.nativeElement.querySelector('.icon-hunter') as HTMLElement;

    expect(hunter().style.transform).toBe('rotate(180deg)');

    click(fixture, ['.turn-right']);
    expect(hunter().style.transform).toBe('rotate(270deg)');

    click(fixture, ['.turn-right']);
    expect(hunter().style.transform).toBe('rotate(0deg)');

    click(fixture, ['.turn-right']);
    expect(hunter().style.transform).toBe('rotate(90deg)');
  });

  it('stacks the stench and breeze hints on the hunter cell while both are perceived', () => {
    const fixture = create({ ...WIN_BOARD, wumpus: 4, pits: [1] });
    const hunterCell = (): HTMLElement =>
      fixture.nativeElement.querySelectorAll('.cell')[0] as HTMLElement;

    expect(hunterCell().querySelector('.hint-stench')).not.toBeNull();
    expect(hunterCell().querySelector('.hint-breeze')).not.toBeNull();
  });

  it('drops the stench hint once the wumpus is dead', () => {
    const fixture = create({ ...WIN_BOARD, wumpus: 4, pits: [] });

    expect(fixture.nativeElement.querySelector('.hint-stench')).not.toBeNull();

    click(fixture, ['.shoot']);

    expect(fixture.nativeElement.querySelector('.hint-stench')).toBeNull();
    expect(fixture.nativeElement.querySelector('.hint-breeze')).toBeNull();
  });

  it('hides hazards until the game is over and then reveals the whole board', () => {
    const fixture = create(DEATH_BOARD);
    const cell = (index: number): HTMLElement =>
      fixture.nativeElement.querySelectorAll('.cell')[index] as HTMLElement;

    expect(fixture.nativeElement.querySelector('.icon-wumpus')).toBeNull();
    expect(fixture.nativeElement.querySelector('.icon-pit')).toBeNull();
    expect(fixture.nativeElement.querySelector('.icon-gold')).toBeNull();

    click(fixture, ['.advance']);

    expect(cell(1).querySelector('.icon-pit')).not.toBeNull();
    expect(cell(12).querySelector('.icon-wumpus')).not.toBeNull();
    expect(cell(5).querySelector('.icon-gold')).not.toBeNull();
    expect(fogged(fixture)).toEqual([]);
  });

  it('hides the collected gold from the reveal', () => {
    const fixture = create(WIN_BOARD);

    click(fixture, toExitWithGold);
    click(fixture, ['.exit']);

    expect(fixture.nativeElement.querySelector('.icon-gold')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.icon-pit')).toHaveSize(1);
    expect(fixture.nativeElement.querySelectorAll('.icon-wumpus')).toHaveSize(1);
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
