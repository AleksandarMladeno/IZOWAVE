import { useClick, useGame } from 'phaser-react-ui';
import React, { useRef } from 'react';

import { phrase } from '~lib/lang';
import { Overlay } from '~scene/system/interface/overlay';
import { GameStat, IGame } from '~type/game';

import { Result } from './result';
import {
  Wrapper, Label, Button, Head, IconRestart,
} from './styles';

type Props = {
  stat: GameStat
  record: Nullable<GameStat>
};

export const GameoverUI: React.FC<Props> = ({ stat, record }) => {
  const game = useGame<IGame>();

  const refButton = useRef<HTMLDivElement>(null);

  useClick(refButton, 'down', () => {
    game.restartGame();
  }, []);

  return (
    <Overlay>
      <Wrapper>
        <Head>
          <Label>GAME OVER</Label>
        <Result stat={stat} record={record} />
          <Button ref={refButton}>
            <IconRestart src='assets/sprites/gameover/restart.png' />
            {phrase('RESTART_GAME')}
          </Button>
        </Head>
      </Wrapper>
    </Overlay>
  );
};

GameoverUI.displayName = 'GameoverUI';
