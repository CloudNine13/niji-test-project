import { Injectable, signal } from '@angular/core';
import { GameEngine } from './game-engine/game-engine';
import type { GameConfig } from './game-engine/types';

@Injectable({ providedIn: 'root' })
export class GameSessionService {
  readonly engine = signal<GameEngine | null>(null);
  readonly config = signal<GameConfig | null>(null);

  start(config: GameConfig): void {
    this.config.set(config);
    this.engine.set(new GameEngine(config));
  }
}
