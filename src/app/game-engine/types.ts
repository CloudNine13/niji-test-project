export type Direction = 'N' | 'E' | 'S' | 'W';

export const DIRECTIONS: readonly Direction[] = ['N', 'E', 'S', 'W'];

export const DIRECTION_DELTAS: Readonly<Record<Direction, Position>> = {
  N: { row: -1, col: 0 },
  E: { row: 0, col: 1 },
  S: { row: 1, col: 0 },
  W: { row: 0, col: -1 },
};

export interface Position {
  readonly row: number;
  readonly col: number;
}

export type Rng = () => number;

export interface GameConfig {
  readonly size: number;
  readonly pits: number;
  readonly arrows: number;
  readonly rng?: Rng;
}

export interface Perceptions {
  readonly stench: boolean;
  readonly breeze: boolean;
  readonly glitter: boolean;
  readonly bump: boolean;
  readonly scream: boolean;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface BoardLayout {
  readonly size: number;
  readonly hunter: Position;
  readonly exit: Position;
  readonly wumpus: Position;
  readonly gold: Position;
  readonly pits: readonly Position[];
}

export interface GameStats {
  readonly moves: number;
  readonly turns: number;
  readonly shots: number;
}

export type ActionOutcome =
  | { readonly kind: 'moved'; readonly to: Position; readonly pickedGold: boolean }
  | { readonly kind: 'bumped'; readonly at: Position }
  | { readonly kind: 'turned'; readonly facing: Direction }
  | { readonly kind: 'shot'; readonly hit: boolean }
  | { readonly kind: 'fell-into-pit'; readonly at: Position }
  | { readonly kind: 'killed-by-wumpus'; readonly at: Position }
  | { readonly kind: 'escaped' }
  | { readonly kind: 'ignored' };

export interface ActionResult {
  readonly outcome: ActionOutcome;
  readonly perceptions: Perceptions;
  readonly status: GameStatus;
  readonly stats: GameStats;
}
