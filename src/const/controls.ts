import { ControlItem } from '~type/controls';

export const CONTROL_KEY = {
  PAUSE: 'keyup-ESC',

  BUILDING_DESTROY: 'keyup-BACKSPACE',
  BUILDING_REPEAR: 'keyup-R',
  BUILDING_BUY_AMMO: 'keyup-F',
  BUILDING_UPGRADE: 'keyup-E',

  SKIP_WAVE_TIMELEFT: 'keyup-N',
};

export const CONTROLS: ControlItem[] = [
  { keys: 'W,A,S,D', label: 'MOVEMENT' },
  { keys: 'LEFT CLICK', label: 'BUILD' },
  { keys: 'RIGHT CLICK', label: 'STOP_BUILD' },
  { keys: 'E', label: 'UPGRADE_BUILDING' },
  { keys: 'R', label: 'REPAIR_BUILDING' },
  { keys: 'F', label: 'BUY_AMMO' },
  { keys: 'BACKSPACE', label: 'DESTROY_BUILDING' },
  { keys: 'N', label: 'SKIP_WAVE_TIMELEFT' },
];
