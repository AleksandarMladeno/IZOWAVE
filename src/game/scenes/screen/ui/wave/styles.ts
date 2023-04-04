import styled, { keyframes } from 'styled-components';

import { INTERFACE_FONT, INTERFACE_TEXT_COLOR } from '~const/interface';

const animationPulse = keyframes`
  0% { transform: scale(0.8) }
  100% { transform: scale(1.0) }
`;

export const Wrapper = styled.div`
  font-family: ${INTERFACE_FONT.PIXEL};
  display: flex;
  color: #fff;
  align-items: center;
`;

export const CurrentNumber = styled.div`
  font-size: 24px;
  line-height: 24px;
  text-shadow: 2px 2px 0 #000;
  padding: 6px 17px 10px 17px;
  background: ${INTERFACE_TEXT_COLOR.INFO_DARK};
  &.going {
    background: ${INTERFACE_TEXT_COLOR.ERROR_DARK};
  }
`;

export const State: any = styled.div`
  margin-left: 10px;
`;

State.Label = styled.div`
  font-size: 12px;
  line-height: 12px;
  opacity: 0.5;
  margin-top: -1px;
  text-shadow: 2px 2px 0 #000;
`;

State.Value = styled.div`
  margin-top: 5px;
  font-size: 20px;
  line-height: 20px;
  text-shadow: 3px 3px 0 #000;
  &.alarm {
    color: ${INTERFACE_TEXT_COLOR.ERROR};
    animation: ${animationPulse} 1s infinite;
  }
`;
