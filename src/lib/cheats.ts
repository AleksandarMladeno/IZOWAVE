import { entries } from '~lib/core';
import { CheatsScheme } from '~type/cheats';

export function setCheatsScheme(data: CheatsScheme) {
  for (const [cheat, callback] of entries(data)) {
    // @ts-ignore
    window[cheat] = () => {
      callback();

      return 'Cheat activated';
    };
  }
}