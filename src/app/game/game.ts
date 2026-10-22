import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { GameEngine } from '../game-engine/game-engine';
import type {
  ActionResult,
  Direction,
  GameStats,
  GameStatus,
  Perceptions,
  Position,
} from '../game-engine/types';
import { GameSessionService } from '../game-session.service';
import type { TranslationKey } from '../i18n/en';
import { I18nService, type TranslationParams } from '../i18n/i18n.service';

interface GameView {
  readonly size: number;
  readonly position: Position;
  readonly direction: Direction;
  readonly exitPosition: Position;
  readonly arrowsLeft: number;
  readonly status: GameStatus;
  readonly stats: GameStats;
  readonly canExit: boolean;
}

interface LogLine {
  readonly key: TranslationKey;
  readonly params?: TranslationParams;
  readonly facing?: Direction;
}

interface Cell {
  readonly index: number;
  readonly hunter: boolean;
  readonly exit: boolean;
}

const DIRECTION_KEYS: Readonly<Record<Direction, TranslationKey>> = {
  N: 'dir.N',
  E: 'dir.E',
  S: 'dir.S',
  W: 'dir.W',
};

const TICK_MS = 1000;

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function totalActions(stats: GameStats): number {
  return stats.moves + stats.turns + stats.shots;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-game',
  styleUrl: './game.scss',
  templateUrl: './game.html',
})
export class Game {
  readonly i18n = inject(I18nService);
  readonly view = signal<GameView | null>(null);
  readonly log = signal<readonly (readonly LogLine[])[]>([]);
  readonly elapsed = computed(() => formatDuration(this.elapsedMs()));
  readonly cells = computed<readonly Cell[]>(() => {
    const view = this.view();
    if (!view) {
      return [];
    }
    return Array.from({ length: view.size ** 2 }, (_, index) => {
      const row = Math.floor(index / view.size);
      const col = index % view.size;
      return {
        index,
        hunter: view.position.row === row && view.position.col === col,
        exit: view.exitPosition.row === row && view.exitPosition.col === col,
      };
    });
  });
  readonly logRef = viewChild<ElementRef<HTMLElement>>('logBox');

  private readonly elapsedMs = signal(0);
  private readonly session = inject(GameSessionService);
  private readonly router = inject(Router);
  private readonly engine: GameEngine | null;
  private readonly startedAt: number;

  constructor() {
    this.engine = this.session.engine();
    this.startedAt = this.session.startedAt() ?? Date.now();
    this.sync();
    const timer = setInterval(() => this.tick(), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  directionLabel(direction: Direction): string {
    return this.i18n.t(DIRECTION_KEYS[direction]);
  }

  entryText(entry: readonly LogLine[]): string {
    return entry.map((line) => this.lineText(line)).join(' ');
  }

  lineText(line: LogLine): string {
    if (line.facing) {
      return this.i18n.t(line.key, {
        ...line.params,
        facing: this.directionLabel(line.facing),
      });
    }
    return this.i18n.t(line.key, line.params);
  }

  advance(): void {
    this.apply((engine) => engine.advance());
  }

  turnLeft(): void {
    this.apply((engine) => engine.turnLeft());
  }

  turnRight(): void {
    this.apply((engine) => engine.turnRight());
  }

  shoot(): void {
    this.apply((engine) => engine.shoot());
  }

  exit(): void {
    this.apply((engine) => engine.exit());
  }

  newGame(): void {
    void this.router.navigateByUrl('/setup');
  }

  private apply(action: (engine: GameEngine) => ActionResult): void {
    if (!this.engine) {
      return;
    }
    const result = action(this.engine);
    this.sync();
    this.elapsedMs.set(Date.now() - this.startedAt);
    this.log.update((entries) => [...entries, ...this.entries(result)]);
    this.scrollLog();
  }

  private tick(): void {
    if (this.view()?.status !== 'playing') {
      return;
    }
    this.elapsedMs.set(Date.now() - this.startedAt);
  }

  private sync(): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }
    this.view.set({
      size: engine.size,
      position: engine.position,
      direction: engine.direction,
      exitPosition: engine.exitPosition,
      arrowsLeft: engine.arrowsLeft,
      status: engine.status,
      stats: engine.stats,
      canExit: engine.canExit(),
    });
  }

  private entries(result: ActionResult): readonly (readonly LogLine[])[] {
    const { outcome, perceptions } = result;
    switch (outcome.kind) {
      case 'moved':
        return [
          [
            { key: 'log.moved', params: { row: outcome.to.row, col: outcome.to.col } },
            ...(outcome.pickedGold ? [{ key: 'log.goldPicked' as const }] : []),
            ...this.perceptionLines(perceptions),
          ],
        ];
      case 'bumped':
        return [[{ key: 'log.bumped', params: { row: outcome.at.row, col: outcome.at.col } }]];
      case 'turned':
        return [[{ key: 'log.turned', facing: outcome.facing }]];
      case 'shot':
        return [[{ key: outcome.hit ? 'log.shotHit' : 'log.shotMiss' }]];
      case 'fell-into-pit':
        return [[{ key: 'log.deathPit', params: { row: outcome.at.row, col: outcome.at.col } }]];
      case 'killed-by-wumpus':
        return [[{ key: 'log.deathWumpus', params: { row: outcome.at.row, col: outcome.at.col } }]];
      case 'escaped':
        return [
          [{ key: 'log.escaped' }],
          [
            {
              key: 'game.won',
              params: { actions: totalActions(result.stats), time: this.elapsed() },
            },
          ],
        ];
      case 'ignored':
        return [[{ key: 'log.ignored' }]];
    }
  }

  private perceptionLines(perceptions: Perceptions): readonly LogLine[] {
    const lines: LogLine[] = [];
    if (perceptions.stench) {
      lines.push({ key: 'perception.stench' });
    }
    if (perceptions.breeze) {
      lines.push({ key: 'perception.breeze' });
    }
    if (perceptions.glitter) {
      lines.push({ key: 'perception.glitter' });
    }
    return lines;
  }

  private scrollLog(): void {
    requestAnimationFrame(() => {
      const element = this.logRef()?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }
}
