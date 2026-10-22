import { Board } from '../board-generator';
import { GameEngine } from '../game-engine';
import { DIRECTION_DELTAS, DIRECTIONS, Direction, GameConfig, Position, Rng } from '../types';

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ScriptedBoard {
  readonly size: number;
  readonly facing: Direction;
  readonly start: number;
  readonly exit: number;
  readonly wumpus: number;
  readonly gold: number;
  readonly pits: readonly number[];
}

export interface ScriptedRng {
  readonly rng: Rng;
  readonly calls: () => number;
}

export function scriptedRng(attempts: readonly ScriptedBoard[]): ScriptedRng {
  const values: number[] = [];
  for (const attempt of attempts) {
    const cells = attempt.size * attempt.size;
    values.push(
      pick(attempt.start, cells),
      pick(DIRECTIONS.indexOf(attempt.facing), DIRECTIONS.length),
      pick(attempt.exit, cells),
      pick(attempt.wumpus, cells),
      pick(attempt.gold, cells),
    );
    for (const pit of attempt.pits) {
      values.push(pick(pit, cells));
    }
  }

  let consumed = 0;
  const rng: Rng = () => {
    if (consumed >= values.length) {
      throw new Error('scripted rng exhausted');
    }
    return values[consumed++];
  };

  return { rng, calls: () => consumed };
}

export function engineFor(board: ScriptedBoard, arrows: number): GameEngine {
  return new GameEngine(configFor(board, arrows, scriptedRng([board]).rng));
}

export function configFor(board: ScriptedBoard, arrows: number, rng: Rng): GameConfig {
  return { size: board.size, pits: board.pits.length, arrows, rng };
}

export function boardIsSolvable(board: Board, arrows: number): boolean {
  const blocked = new Set(board.pits.map((pit) => indexOf(pit, board.size)));
  if (arrows === 0) {
    blocked.add(indexOf(board.wumpus, board.size));
  }

  const reached = new Set<number>([indexOf(board.start, board.size)]);
  const queue: Position[] = [board.start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const delta of Object.values(DIRECTION_DELTAS)) {
      const row = current.row + delta.row;
      const col = current.col + delta.col;
      if (row < 0 || row >= board.size || col < 0 || col >= board.size) {
        continue;
      }
      const index = row * board.size + col;
      if (blocked.has(index) || reached.has(index)) {
        continue;
      }
      reached.add(index);
      queue.push({ row, col });
    }
  }

  return (
    reached.has(indexOf(board.gold, board.size)) && reached.has(indexOf(board.exit, board.size))
  );
}

export function indexOf(position: Position, size: number): number {
  return position.row * size + position.col;
}

export function position(row: number, col: number): Position {
  return { row, col };
}

function pick(index: number, bound: number): number {
  return (index + 0.5) / bound;
}
