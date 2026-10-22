import { generateBoard } from './board-generator';
import { Position } from './types';
import {
  boardIsSolvable,
  indexOf,
  mulberry32,
  position,
  ScriptedBoard,
  scriptedRng,
} from './testing/engine-fixtures';

describe('generateBoard', () => {
  it('places hunter, exit, wumpus, gold and pits on distinct in-bounds cells', () => {
    for (const size of [4, 5, 6, 7, 8, 9, 10]) {
      for (const pits of [0, 2, size * size - 6]) {
        const board = generateBoard({ size, pits, arrows: 1, rng: mulberry32(size * 1009 + pits) });
        const cells = [board.start, board.exit, board.wumpus, board.gold, ...board.pits];

        expect(board.pits.length).withContext(`size ${size} pits ${pits}`).toBe(pits);
        expect(new Set(cells.map((cell) => indexOf(cell, size))).size).toBe(cells.length);
        for (const cell of cells) {
          expect(cell.row).toBeGreaterThanOrEqual(0);
          expect(cell.row).toBeLessThan(size);
          expect(cell.col).toBeGreaterThanOrEqual(0);
          expect(cell.col).toBeLessThan(size);
        }
      }
    }
  });

  it('generates only boards with a walkable start to gold to exit path', () => {
    const sizes = [4, 5, 6, 7, 8, 9, 10];
    const arrowCounts = [0, 1, 3];

    for (let seed = 1; seed <= 100; seed++) {
      const size = sizes[seed % sizes.length];
      const arrows = arrowCounts[seed % arrowCounts.length];
      const pits = seed % 3 === 0 ? size * size - 6 : seed % 5;
      const board = generateBoard({ size, pits, arrows, rng: mulberry32(seed * 7919) });

      expect(boardIsSolvable(board, arrows))
        .withContext(`seed ${seed}, size ${size}, pits ${pits}, arrows ${arrows}`)
        .toBeTrue();
    }
  });

  it('re-rolls a board whose only link between start, gold and exit is the wumpus with zero arrows', () => {
    const corridor: ScriptedBoard = {
      size: 3,
      facing: 'E',
      start: 0,
      exit: 8,
      wumpus: 4,
      gold: 5,
      pits: [1, 7],
    };
    const replacement: ScriptedBoard = {
      size: 3,
      facing: 'N',
      start: 0,
      exit: 1,
      wumpus: 8,
      gold: 2,
      pits: [6, 7],
    };
    const script = scriptedRng([corridor, replacement]);

    const board = generateBoard({ size: 3, pits: 2, arrows: 0, rng: script.rng });

    expect(script.calls()).toBe(14);
    expect(board.start).toEqual(position(0, 0));
    expect(board.exit).toEqual(position(0, 1));
    expect(board.wumpus).toEqual(position(2, 2));
    expect(board.gold).toEqual(position(0, 2));
    expect(board.pits.map((pit: Position) => [pit.row, pit.col])).toEqual([
      [2, 0],
      [2, 1],
    ]);
    expect(boardIsSolvable(board, 0)).toBeTrue();
  });

  it('accepts the same wumpus link on the first attempt when the hunter has an arrow', () => {
    const corridor: ScriptedBoard = {
      size: 3,
      facing: 'E',
      start: 0,
      exit: 8,
      wumpus: 4,
      gold: 5,
      pits: [1, 7],
    };
    const script = scriptedRng([corridor]);

    const board = generateBoard({ size: 3, pits: 2, arrows: 1, rng: script.rng });

    expect(script.calls()).toBe(7);
    expect(board.wumpus).toEqual(position(1, 1));
    expect(board.gold).toEqual(position(1, 2));
    expect(board.exit).toEqual(position(2, 2));
  });

  it('rejects sizes, pit counts and arrow counts outside the supported ranges', () => {
    expect(() => generateBoard({ size: 1, pits: 0, arrows: 1 })).toThrowError(RangeError);
    expect(() => generateBoard({ size: 4.5, pits: 0, arrows: 1 })).toThrowError(RangeError);
    expect(() => generateBoard({ size: 4, pits: 13, arrows: 1 })).toThrowError(RangeError);
    expect(() => generateBoard({ size: 4, pits: -1, arrows: 1 })).toThrowError(RangeError);
    expect(() => generateBoard({ size: 4, pits: 0, arrows: -1 })).toThrowError(RangeError);
  });
});
