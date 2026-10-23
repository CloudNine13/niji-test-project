import { DIRECTION_DELTAS, DIRECTIONS, Direction, GameConfig, Position, Rng } from './types';

export interface Board {
  readonly size: number;
  readonly start: Position;
  readonly startDirection: Direction;
  readonly exit: Position;
  readonly wumpus: Position;
  readonly gold: Position;
  readonly pits: readonly Position[];
}

export function generateBoard(config: GameConfig): Board {
  assertConfig(config);

  const { size, pits, arrows } = config;
  const rng = config.rng ?? Math.random;

  for (;;) {
    const occupied = new Set<number>();
    const start = takeCell(rng, size, occupied);
    const startDirection = DIRECTIONS[randomIndex(rng, DIRECTIONS.length)];
    const exit = takeCell(rng, size, occupied);
    const wumpus = takeCell(rng, size, occupied);
    const gold = takeCell(rng, size, occupied);
    const pitCells: Position[] = [];
    for (let placed = 0; placed < pits; placed++) {
      pitCells.push(takeCell(rng, size, occupied));
    }

    if (isSolvable(size, start, gold, exit, wumpus, arrows, pitCells)) {
      return { size, start, startDirection, exit, wumpus, gold, pits: pitCells };
    }
  }
}

function assertConfig(config: GameConfig): void {
  const { size, pits, arrows } = config;
  if (!Number.isInteger(size) || size < 2) {
    throw new RangeError(`size must be an integer >= 2, received ${size}`);
  }
  const cells = size * size;
  if (!Number.isInteger(pits) || pits < 0 || pits > cells - 4) {
    throw new RangeError(`pits must be an integer in [0, ${cells - 4}], received ${pits}`);
  }
  if (!Number.isInteger(arrows) || arrows < 0) {
    throw new RangeError(`arrows must be an integer >= 0, received ${arrows}`);
  }
}

function randomIndex(rng: Rng, bound: number): number {
  return Math.min(bound - 1, Math.floor(rng() * bound));
}

function takeCell(rng: Rng, size: number, occupied: Set<number>): Position {
  for (;;) {
    const index = randomIndex(rng, size * size);
    if (occupied.has(index)) {
      continue;
    }
    occupied.add(index);
    return { row: Math.floor(index / size), col: index % size };
  }
}

function isSolvable(
  size: number,
  start: Position,
  gold: Position,
  exit: Position,
  wumpus: Position,
  arrows: number,
  pits: readonly Position[],
): boolean {
  const blocked = new Set<number>(pits.map((pit) => cellIndex(pit, size)));
  if (arrows === 0) {
    blocked.add(cellIndex(wumpus, size));
  }

  const reached = new Set<number>([cellIndex(start, size)]);
  const queue: number[] = [cellIndex(start, size)];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    const row = Math.floor(current / size);
    const col = current % size;
    for (const delta of Object.values(DIRECTION_DELTAS)) {
      const nextRow = row + delta.row;
      const nextCol = col + delta.col;
      if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) {
        continue;
      }
      const next = nextRow * size + nextCol;
      if (blocked.has(next) || reached.has(next)) {
        continue;
      }
      reached.add(next);
      queue.push(next);
    }
  }

  return reached.has(cellIndex(gold, size)) && reached.has(cellIndex(exit, size));
}

function cellIndex(position: Position, size: number): number {
  return position.row * size + position.col;
}
