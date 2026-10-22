import { Board, generateBoard } from './board-generator';
import {
  ActionOutcome,
  ActionResult,
  DIRECTION_DELTAS,
  DIRECTIONS,
  Direction,
  GameConfig,
  GameStats,
  GameStatus,
  Perceptions,
  Position,
} from './types';

export class GameEngine {
  readonly #size: number;
  readonly #exit: Position;
  readonly #wumpus: Position;
  readonly #pits: ReadonlySet<number>;
  #gold: Position | null;
  #position: Position;
  #direction: Direction;
  #hasGold = false;
  #arrowsLeft: number;
  #wumpusAlive = true;
  #status: GameStatus = 'playing';
  #stats: GameStats = { moves: 0, turns: 0, shots: 0 };

  constructor(config: GameConfig) {
    const board: Board = generateBoard(config);
    this.#size = board.size;
    this.#exit = board.exit;
    this.#wumpus = board.wumpus;
    this.#pits = new Set(board.pits.map((pit) => this.#index(pit)));
    this.#gold = board.gold;
    this.#position = board.start;
    this.#direction = board.startDirection;
    this.#arrowsLeft = config.arrows;
  }

  get position(): Position {
    return this.#position;
  }

  get direction(): Direction {
    return this.#direction;
  }

  get hasGold(): boolean {
    return this.#hasGold;
  }

  get arrowsLeft(): number {
    return this.#arrowsLeft;
  }

  get wumpusAlive(): boolean {
    return this.#wumpusAlive;
  }

  get status(): GameStatus {
    return this.#status;
  }

  get stats(): GameStats {
    return this.#stats;
  }

  get exitPosition(): Position {
    return this.#exit;
  }

  get size(): number {
    return this.#size;
  }

  canExit(): boolean {
    return this.#hasGold && this.#sameCell(this.#position, this.#exit);
  }

  advance(): ActionResult {
    if (this.#status !== 'playing') {
      return this.#result({ kind: 'ignored' });
    }

    const delta = DIRECTION_DELTAS[this.#direction];
    const target = { row: this.#position.row + delta.row, col: this.#position.col + delta.col };
    if (!this.#inBounds(target)) {
      return this.#result({ kind: 'bumped', at: this.#position }, { bump: true });
    }

    this.#position = target;
    this.#stats = { ...this.#stats, moves: this.#stats.moves + 1 };

    if (this.#pits.has(this.#index(target))) {
      this.#status = 'lost';
      return this.#result({ kind: 'fell-into-pit', at: target });
    }
    if (this.#wumpusAlive && this.#sameCell(target, this.#wumpus)) {
      this.#status = 'lost';
      return this.#result({ kind: 'killed-by-wumpus', at: target });
    }

    const pickedGold = this.#gold !== null && this.#sameCell(target, this.#gold);
    if (pickedGold) {
      this.#hasGold = true;
      this.#gold = null;
    }
    return this.#result({ kind: 'moved', to: target, pickedGold }, { glitter: pickedGold });
  }

  turnLeft(): ActionResult {
    return this.#turn(-1);
  }

  turnRight(): ActionResult {
    return this.#turn(1);
  }

  shoot(): ActionResult {
    if (this.#status !== 'playing' || this.#arrowsLeft === 0) {
      return this.#result({ kind: 'ignored' });
    }

    this.#arrowsLeft -= 1;
    this.#stats = { ...this.#stats, shots: this.#stats.shots + 1 };

    const delta = DIRECTION_DELTAS[this.#direction];
    let row = this.#position.row + delta.row;
    let col = this.#position.col + delta.col;
    while (this.#inBounds({ row, col })) {
      if (this.#wumpusAlive && row === this.#wumpus.row && col === this.#wumpus.col) {
        this.#wumpusAlive = false;
        return this.#result({ kind: 'shot', hit: true }, { scream: true });
      }
      row += delta.row;
      col += delta.col;
    }

    return this.#result({ kind: 'shot', hit: false });
  }

  exit(): ActionResult {
    if (this.#status !== 'playing' || !this.canExit()) {
      return this.#result({ kind: 'ignored' });
    }

    this.#status = 'won';
    return this.#result({ kind: 'escaped' });
  }

  #turn(step: 1 | -1): ActionResult {
    if (this.#status !== 'playing') {
      return this.#result({ kind: 'ignored' });
    }

    const index = DIRECTIONS.indexOf(this.#direction);
    this.#direction = DIRECTIONS[(index + step + DIRECTIONS.length) % DIRECTIONS.length];
    this.#stats = { ...this.#stats, turns: this.#stats.turns + 1 };
    return this.#result({ kind: 'turned', facing: this.#direction });
  }

  #result(outcome: ActionOutcome, overrides: Partial<Perceptions> = {}): ActionResult {
    return {
      outcome,
      perceptions: { ...this.#perceptions(), ...overrides },
      status: this.#status,
      stats: this.#stats,
    };
  }

  #perceptions(): Perceptions {
    const adjacent = this.#adjacentCells(this.#position);
    return {
      stench: this.#wumpusAlive && adjacent.some((cell) => this.#sameCell(cell, this.#wumpus)),
      breeze: adjacent.some((cell) => this.#pits.has(this.#index(cell))),
      glitter: this.#gold !== null && this.#sameCell(this.#position, this.#gold),
      bump: false,
      scream: false,
    };
  }

  #adjacentCells(position: Position): readonly Position[] {
    return Object.values(DIRECTION_DELTAS)
      .map((delta) => ({ row: position.row + delta.row, col: position.col + delta.col }))
      .filter((cell) => this.#inBounds(cell));
  }

  #inBounds(position: Position): boolean {
    return (
      position.row >= 0 &&
      position.row < this.#size &&
      position.col >= 0 &&
      position.col < this.#size
    );
  }

  #index(position: Position): number {
    return position.row * this.#size + position.col;
  }

  #sameCell(a: Position, b: Position): boolean {
    return a.row === b.row && a.col === b.col;
  }
}
