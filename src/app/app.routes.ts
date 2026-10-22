import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Config } from './config/config';
import { Game } from './game/game';
import { GameSessionService } from './game-session.service';

const requireSession: CanActivateFn = () => {
  const router = inject(Router);
  return inject(GameSessionService).engine() ? true : router.createUrlTree(['/setup']);
};

export const routes: Routes = [
  { path: 'setup', component: Config },
  { path: 'game', component: Game, canActivate: [requireSession] },
  { path: '**', redirectTo: 'setup' },
];
