import { Routes } from '@angular/router';
import { Config } from './config/config';
import { Game } from './game/game';

export const routes: Routes = [
  { path: 'setup', component: Config },
  { path: 'game', component: Game },
  { path: '**', redirectTo: 'setup' },
];
