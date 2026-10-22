import { TestBed } from '@angular/core/testing';
import { GameSessionService } from './game-session.service';

describe('GameSessionService', () => {
  let session: GameSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    session = TestBed.inject(GameSessionService);
  });

  it('has no session before the first game starts', () => {
    expect(session.engine()).toBeNull();
    expect(session.config()).toBeNull();
  });

  it('exposes an engine built from the requested configuration', () => {
    const config = { size: 7, pits: 3, arrows: 2 };

    session.start(config);

    expect(session.config()).toEqual(config);
    expect(session.engine()?.size).toBe(7);
    expect(session.engine()?.arrowsLeft).toBe(2);
    expect(session.engine()?.status).toBe('playing');
  });
});
