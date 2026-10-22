import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { GameConfig } from '../game-engine/types';
import { GameSessionService } from '../game-session.service';
import { I18nService } from '../i18n/i18n.service';

const SIZE_OPTIONS: readonly number[] = [4, 5, 6, 7, 8, 9, 10];
const ARROW_OPTIONS: readonly number[] = Array.from({ length: 11 }, (_, index) => index);
const DEFAULT_SIZE = 4;
const DEFAULT_PITS = 2;
const DEFAULT_ARROWS = 1;
const PIT_SLACK = 6;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config',
  styleUrl: './config.scss',
  templateUrl: './config.html',
})
export class Config {
  readonly i18n = inject(I18nService);
  readonly sizeOptions = SIZE_OPTIONS;
  readonly arrowOptions = ARROW_OPTIONS;
  readonly size = signal(DEFAULT_SIZE);
  readonly pits = signal(DEFAULT_PITS);
  readonly arrows = signal(DEFAULT_ARROWS);
  readonly maxPits = computed(() => this.size() ** 2 - PIT_SLACK);
  readonly pitOptions = computed(() =>
    Array.from({ length: this.maxPits() + 1 }, (_, index) => index),
  );

  private readonly session = inject(GameSessionService);
  private readonly router = inject(Router);

  constructor() {
    const stored = this.session.config();
    if (stored) {
      this.size.set(stored.size);
      this.pits.set(stored.pits);
      this.arrows.set(stored.arrows);
    }
  }

  setSize(event: Event): void {
    this.size.set(Number((event.target as HTMLSelectElement).value));
    this.pits.update((pits) => Math.min(pits, this.maxPits()));
  }

  setPits(event: Event): void {
    this.pits.set(Number((event.target as HTMLSelectElement).value));
  }

  setArrows(event: Event): void {
    this.arrows.set(Number((event.target as HTMLSelectElement).value));
  }

  start(): void {
    const config: GameConfig = { size: this.size(), pits: this.pits(), arrows: this.arrows() };
    this.session.start(config);
    void this.router.navigateByUrl('/game');
  }
}
