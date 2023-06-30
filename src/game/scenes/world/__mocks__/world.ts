import { TutorialStepState } from '~type/tutorial';
import { IWorld } from '~type/world';

const world = {
  getTime: jest.fn(),
  isTimePaused: jest.fn(() => false),
  setTimePause: jest.fn(),
  spawnEnemy: jest.fn(),
  game: {
    difficulty: 1,
    tutorial: {
      isDisabled: true,
      beg: jest.fn(),
      end: jest.fn(),
      state: jest.fn(() => TutorialStepState.END),
    },
    analytics: {
      track: jest.fn(),
    },
    getDifficultyMultiplier: jest.fn(() => 1.0),
  },
  entityGroups: {
    enemies: {
      getTotalUsed: jest.fn(),
    },
  },
  player: {},
  input: {
    keyboard: {
      on: jest.fn(),
    },
  },
  sound: {
    play: jest.fn(),
  },
} as unknown as IWorld;

export default world;
