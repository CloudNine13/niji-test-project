import { GameEngine } from './game-engine';
import { engineFor, indexOf, position, ScriptedBoard } from './testing/engine-fixtures';

function expectIgnored(engine: GameEngine): void {
  const before = {
    position: engine.position,
    direction: engine.direction,
    arrowsLeft: engine.arrowsLeft,
    hasGold: engine.hasGold,
    wumpusAlive: engine.wumpusAlive,
    status: engine.status,
    stats: engine.stats,
  };

  expect(engine.advance().outcome).toEqual({ kind: 'ignored' });
  expect(engine.turnLeft().outcome).toEqual({ kind: 'ignored' });
  expect(engine.turnRight().outcome).toEqual({ kind: 'ignored' });
  expect(engine.shoot().outcome).toEqual({ kind: 'ignored' });
  expect(engine.exit().outcome).toEqual({ kind: 'ignored' });
  expect({
    position: engine.position,
    direction: engine.direction,
    arrowsLeft: engine.arrowsLeft,
    hasGold: engine.hasGold,
    wumpusAlive: engine.wumpusAlive,
    status: engine.status,
    stats: engine.stats,
  }).toEqual(before);
}

describe('GameEngine advance', () => {
  const goldAhead: ScriptedBoard = {
    size: 4,
    facing: 'E',
    start: 5,
    exit: 15,
    wumpus: 12,
    gold: 6,
    pits: [9],
  };

  it('moves forward one cell and reports the new coordinates', () => {
    const engine = engineFor(goldAhead, 1);

    const result = engine.advance();

    expect(result.outcome).toEqual({ kind: 'moved', to: position(1, 2), pickedGold: true });
    expect(result.stats.moves).toBe(1);
    expect(engine.position).toEqual(position(1, 2));
  });

  it('reports glitter when orthogonally adjacent to gold and clears it on pickup', () => {
    const engine = engineFor(goldAhead, 1);

    expect(engine.perceptions.glitter).toBeTrue();

    const diagonalEngine = engineFor({ ...goldAhead, start: 1 }, 1);
    expect(diagonalEngine.perceptions.glitter).toBeFalse();

    const picked = engine.advance();

    expect(picked.outcome).toEqual({ kind: 'moved', to: position(1, 2), pickedGold: true });
    expect(picked.perceptions.glitter).toBeFalse();
    expect(engine.hasGold).toBeTrue();

    const left = engine.advance();
    expect(left.outcome).toEqual({ kind: 'moved', to: position(1, 3), pickedGold: false });
    expect(left.perceptions.glitter).toBeFalse();
    expect(engine.hasGold).toBeTrue();
  });

  it('bumps into a wall without moving or counting a move', () => {
    const engine = engineFor({ ...goldAhead, start: 7 }, 1);

    const bump = engine.advance();

    expect(bump.outcome).toEqual({ kind: 'bumped', at: position(1, 3) });
    expect(bump.perceptions.bump).toBeTrue();
    expect(bump.stats.moves).toBe(0);
    expect(engine.position).toEqual(position(1, 3));
    expect(engine.turnLeft().perceptions.bump).toBeFalse();
  });

  it('ends the game when the hunter steps into a pit', () => {
    const engine = engineFor(
      { size: 4, facing: 'S', start: 5, exit: 15, wumpus: 0, gold: 2, pits: [9] },
      1,
    );

    const result = engine.advance();

    expect(result.outcome).toEqual({ kind: 'fell-into-pit', at: position(2, 1) });
    expect(result.status).toBe('lost');
    expect(engine.status).toBe('lost');
    expect(result.stats.moves).toBe(1);
  });

  it('ends the game when the hunter steps into the live wumpus', () => {
    const engine = engineFor(
      { size: 4, facing: 'W', start: 5, exit: 15, wumpus: 4, gold: 6, pits: [9] },
      1,
    );

    const result = engine.advance();

    expect(result.outcome).toEqual({ kind: 'killed-by-wumpus', at: position(1, 0) });
    expect(result.status).toBe('lost');
    expect(engine.position).toEqual(position(1, 0));
  });

  it('ignores every action once the game is over', () => {
    const engine = engineFor(
      { size: 4, facing: 'S', start: 5, exit: 15, wumpus: 0, gold: 2, pits: [9] },
      1,
    );
    engine.advance();

    expectIgnored(engine);
  });
});

describe('GameEngine perceptions', () => {
  it('reports stench from the orthogonally adjacent wumpus', () => {
    const engine = engineFor(
      { size: 4, facing: 'N', start: 5, exit: 3, wumpus: 4, gold: 6, pits: [11] },
      1,
    );

    const result = engine.turnRight();

    expect(result.perceptions.stench).toBeTrue();
    expect(result.perceptions.breeze).toBeFalse();
  });

  it('reports breeze from an orthogonally adjacent pit', () => {
    const engine = engineFor(
      { size: 4, facing: 'N', start: 5, exit: 3, wumpus: 12, gold: 6, pits: [9] },
      1,
    );

    const result = engine.turnRight();

    expect(result.perceptions.breeze).toBeTrue();
    expect(result.perceptions.stench).toBeFalse();
  });

  it('ignores hazards that only touch the hunter diagonally', () => {
    const engine = engineFor(
      { size: 4, facing: 'N', start: 5, exit: 3, wumpus: 0, gold: 2, pits: [10] },
      1,
    );

    const result = engine.turnRight();

    expect(result.perceptions.stench).toBeFalse();
    expect(result.perceptions.breeze).toBeFalse();
    expect(result.perceptions.glitter).toBeFalse();
  });

  it('reports stench and breeze together and recomputes them for the new cell', () => {
    const engine = engineFor(
      { size: 4, facing: 'N', start: 5, exit: 3, wumpus: 4, gold: 6, pits: [9] },
      1,
    );

    const atStart = engine.turnRight();
    const moved = engine.advance();

    expect(atStart.perceptions.stench).toBeTrue();
    expect(atStart.perceptions.breeze).toBeTrue();
    expect(moved.outcome).toEqual({ kind: 'moved', to: position(1, 2), pickedGold: true });
    expect(moved.perceptions.stench).toBeFalse();
    expect(moved.perceptions.breeze).toBeFalse();
  });

  it('drops the stench once the wumpus is dead and its cell becomes safe', () => {
    const engine = engineFor(
      { size: 4, facing: 'E', start: 5, exit: 15, wumpus: 6, gold: 2, pits: [] },
      1,
    );
    expect(engine.turnLeft().perceptions.stench).toBeTrue();
    engine.turnRight();

    const shot = engine.shoot();
    const ontoCorpse = engine.advance();

    expect(shot.perceptions.stench).toBeFalse();
    expect(shot.perceptions.scream).toBeTrue();
    expect(engine.wumpusAlive).toBeFalse();
    expect(ontoCorpse.outcome).toEqual({ kind: 'moved', to: position(1, 2), pickedGold: false });
    expect(ontoCorpse.status).toBe('playing');
  });
});

describe('GameEngine turning', () => {
  const turnBoard: ScriptedBoard = {
    size: 4,
    facing: 'N',
    start: 5,
    exit: 15,
    wumpus: 12,
    gold: 6,
    pits: [],
  };

  it('rotates left and right in place and counts every turn', () => {
    const engine = engineFor(turnBoard, 1);

    const left = engine.turnLeft();
    const right = engine.turnRight();

    expect(left.outcome).toEqual({ kind: 'turned', facing: 'W' });
    expect(right.outcome).toEqual({ kind: 'turned', facing: 'N' });
    expect(engine.position).toEqual(position(1, 1));
    expect(engine.direction).toBe('N');
    expect(engine.stats.turns).toBe(2);
  });

  it('cycles through every orientation in both directions', () => {
    const clockwise = engineFor(turnBoard, 1);
    const counterClockwise = engineFor(turnBoard, 1);

    expect(
      [
        clockwise.turnRight(),
        clockwise.turnRight(),
        clockwise.turnRight(),
        clockwise.turnRight(),
      ].map((result) => (result.outcome.kind === 'turned' ? result.outcome.facing : null)),
    ).toEqual(['E', 'S', 'W', 'N']);
    expect(
      [
        counterClockwise.turnLeft(),
        counterClockwise.turnLeft(),
        counterClockwise.turnLeft(),
        counterClockwise.turnLeft(),
      ].map((result) => (result.outcome.kind === 'turned' ? result.outcome.facing : null)),
    ).toEqual(['W', 'S', 'E', 'N']);
  });
});

describe('GameEngine shooting', () => {
  it('kills a wumpus standing in the facing direction', () => {
    const engine = engineFor(
      { size: 4, facing: 'E', start: 5, exit: 15, wumpus: 7, gold: 2, pits: [] },
      1,
    );

    const result = engine.shoot();

    expect(result.outcome).toEqual({ kind: 'shot', hit: true });
    expect(result.perceptions.scream).toBeTrue();
    expect(result.stats.shots).toBe(1);
    expect(engine.wumpusAlive).toBeFalse();
    expect(engine.arrowsLeft).toBe(0);
  });

  it('counts a miss when the arrow leaves the board before reaching the wumpus', () => {
    const engine = engineFor(
      { size: 4, facing: 'N', start: 5, exit: 15, wumpus: 7, gold: 2, pits: [] },
      2,
    );

    const result = engine.shoot();

    expect(result.outcome).toEqual({ kind: 'shot', hit: false });
    expect(result.perceptions.scream).toBeFalse();
    expect(engine.wumpusAlive).toBeTrue();
    expect(engine.arrowsLeft).toBe(1);
    expect(result.stats.shots).toBe(1);
  });

  it('refuses to shoot without arrows', () => {
    const engine = engineFor(
      { size: 4, facing: 'E', start: 5, exit: 15, wumpus: 7, gold: 2, pits: [] },
      0,
    );

    const result = engine.shoot();

    expect(result.outcome).toEqual({ kind: 'ignored' });
    expect(result.stats.shots).toBe(0);
    expect(engine.arrowsLeft).toBe(0);
    expect(engine.wumpusAlive).toBeTrue();
  });
});

describe('GameEngine exit', () => {
  it('refuses to exit away from the exit cell', () => {
    const engine = engineFor(
      { size: 4, facing: 'E', start: 5, exit: 15, wumpus: 7, gold: 2, pits: [] },
      1,
    );

    expect(engine.canExit()).toBeFalse();
    expect(engine.exit().outcome).toEqual({ kind: 'ignored' });
    expect(engine.status).toBe('playing');
  });

  it('refuses to exit without the gold even while standing on the exit cell', () => {
    const engine = engineFor(
      { size: 4, facing: 'E', start: 5, exit: 6, wumpus: 7, gold: 2, pits: [] },
      1,
    );

    engine.advance();

    expect(engine.position).toEqual(position(1, 2));
    expect(engine.hasGold).toBeFalse();
    expect(engine.canExit()).toBeFalse();
    expect(engine.exit().outcome).toEqual({ kind: 'ignored' });
    expect(engine.status).toBe('playing');
  });

  it('wins by exiting the exit cell with the gold', () => {
    const engine = engineFor(
      { size: 4, facing: 'E', start: 5, exit: 10, wumpus: 7, gold: 6, pits: [] },
      1,
    );

    engine.advance();
    expect(engine.canExit()).toBeFalse();
    engine.turnRight();
    engine.advance();

    expect(engine.position).toEqual(position(2, 2));
    expect(engine.exitPosition).toEqual(position(2, 2));
    expect(engine.canExit()).toBeTrue();
    const result = engine.exit();
    expect(result.outcome).toEqual({ kind: 'escaped' });
    expect(result.status).toBe('won');
    expect(engine.status).toBe('won');
    expect(engine.canExit()).toBeTrue();
  });

  it('ignores every action after winning', () => {
    const engine = engineFor(
      { size: 4, facing: 'E', start: 5, exit: 10, wumpus: 7, gold: 6, pits: [] },
      1,
    );
    engine.advance();
    engine.turnRight();
    engine.advance();
    engine.exit();

    expectIgnored(engine);
  });
});

describe('GameEngine stats', () => {
  it('counts moves, turns and shots separately', () => {
    const engine = engineFor(
      { size: 4, facing: 'N', start: 5, exit: 15, wumpus: 12, gold: 2, pits: [] },
      2,
    );

    expect(engine.stats).toEqual({ moves: 0, turns: 0, shots: 0 });
    expect(engine.advance().stats).toEqual({ moves: 1, turns: 0, shots: 0 });
    expect(engine.turnRight().stats).toEqual({ moves: 1, turns: 1, shots: 0 });
    expect(engine.shoot().stats).toEqual({ moves: 1, turns: 1, shots: 1 });
    expect(engine.turnLeft().stats).toEqual({ moves: 1, turns: 2, shots: 1 });
    expect(engine.advance().stats).toEqual({ moves: 1, turns: 2, shots: 1 });
    expect(engine.stats).toEqual({ moves: 1, turns: 2, shots: 1 });
  });
});

describe('GameEngine visited cells', () => {
  const goldAhead: ScriptedBoard = {
    size: 4,
    facing: 'E',
    start: 5,
    exit: 15,
    wumpus: 12,
    gold: 6,
    pits: [9],
  };

  const visited = (engine: GameEngine): readonly number[] =>
    Array.from(engine.visitedCells).sort((a, b) => a - b);

  it('starts with only the starting cell visited', () => {
    const engine = engineFor(goldAhead, 1);

    expect(visited(engine)).toEqual([indexOf(position(1, 1), 4)]);
  });

  it('adds the destination of every advance', () => {
    const engine = engineFor(goldAhead, 1);

    engine.advance();
    engine.advance();

    expect(visited(engine)).toEqual([5, 6, 7]);
  });

  it('adds no cell for bumps, turns or shots', () => {
    const engine = engineFor({ ...goldAhead, start: 7 }, 1);

    expect(engine.advance().outcome).toEqual({ kind: 'bumped', at: position(1, 3) });
    engine.turnLeft();
    engine.shoot();

    expect(visited(engine)).toEqual([7]);
  });

  it('keeps the visited set after the game ends', () => {
    const engine = engineFor(
      { size: 4, facing: 'S', start: 5, exit: 15, wumpus: 0, gold: 2, pits: [9] },
      1,
    );

    engine.advance();

    expect(engine.status).toBe('lost');
    expect(visited(engine)).toEqual([5, 9]);
  });
});

describe('GameEngine layout', () => {
  it('exposes the seeded board and follows the hunter', () => {
    const engine = engineFor(
      { size: 5, facing: 'S', start: 0, exit: 24, wumpus: 12, gold: 7, pits: [3, 18] },
      1,
    );

    expect(engine.layout).toEqual({
      size: 5,
      hunter: position(0, 0),
      exit: position(4, 4),
      wumpus: position(2, 2),
      gold: position(1, 2),
      pits: [position(0, 3), position(3, 3)],
    });

    engine.advance();

    expect(engine.layout.hunter).toEqual(position(1, 0));
    expect(engine.layout.pits).toEqual([position(0, 3), position(3, 3)]);
  });

  it('keeps the gold and wumpus positions once the gold is held and the wumpus is dead', () => {
    const goldEngine = engineFor(
      { size: 4, facing: 'S', start: 0, exit: 15, wumpus: 12, gold: 4, pits: [9] },
      1,
    );
    goldEngine.advance();

    expect(goldEngine.hasGold).toBeTrue();
    expect(goldEngine.layout.gold).toEqual(position(1, 0));
    expect(goldEngine.perceptions.glitter).toBeFalse();

    const wumpusEngine = engineFor(
      { size: 4, facing: 'E', start: 0, exit: 15, wumpus: 3, gold: 5, pits: [9] },
      1,
    );
    wumpusEngine.shoot();

    expect(wumpusEngine.wumpusAlive).toBeFalse();
    expect(wumpusEngine.layout.wumpus).toEqual(position(0, 3));
  });
});
