import styled from 'styled-components';

import { INTERFACE_FONT, INTERFACE_TEXT_COLOR } from '~const/interface';
import { BUILDING_MAX_UPGRADE_LEVEL } from '~const/world/entities/building';
import { ScreenTexture } from '~type/screen';

export const Wrapper = styled.div`
  position: absolute;
  width: 280px;
  background: ${INTERFACE_TEXT_COLOR.BLUE_DARK}cc;
  padding: 20px;
  transform: translate(-50%, -100%);
  margin-top: -32px;
  &::after {
    position: absolute;
    content: '';
    bottom: 0;
    left: 50%;
    transform: translate(-50%, 100%);
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 15px solid ${INTERFACE_TEXT_COLOR.BLUE_DARK}cc;
  }
`;

export const Name = styled.div`
  font-family: ${INTERFACE_FONT.PIXEL};
  color: ${INTERFACE_TEXT_COLOR.PRIMARY};
  font-size: 19px;
  line-height: 19px;
  text-shadow: 3px 3px 0 #332717;
`;

export const UpgradeLevel: any = styled.div`
  margin-top: 15px;
  display: grid;
  grid-template-columns: repeat(${BUILDING_MAX_UPGRADE_LEVEL}, 1fr);
  grid-gap: 2px;
`;

UpgradeLevel.Item = styled.div`
  height: 10px;
  border: 1px solid #000;
  background: #000;
  &.active {
    background: ${INTERFACE_TEXT_COLOR.INFO_DARK};
  }
`;

export const Parameters = styled.div`
  margin-top: 15px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 5px;
`;

export const Parameter: any = styled.div`
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  padding: 5px;
`;

Parameter.IconWrapper = styled.div`
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  margin-right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

Parameter.Icon = styled.div`
  width: 10px;
  height: 10px;
  background: url(assets/sprites/${ScreenTexture.ICON}.png);
`;

Parameter.Info = styled.div`
  color: #fff;
  &.attention {
    color: ${INTERFACE_TEXT_COLOR.WARN};
  }
`;

Parameter.Label = styled.div`
  font-family: ${INTERFACE_FONT.MONOSPACE};
  font-size: 11px;
  line-height: 11px;
  opacity: 0.75;
  margin-top: -2px;
`;

Parameter.Value = styled.div`
  font-family: ${INTERFACE_FONT.PIXEL};
  font-size: 14px;
  line-height: 14px;
`;

export const Actions: any = styled.div`
  margin-top: 100px;
  position: absolute;
  left: 50%;
`;

export const Action = styled.div`
  padding: 3px 7px 4px 7px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-family: ${INTERFACE_FONT.MONOSPACE};
  font-size: 12px;
  line-height: 12px;
  transform: translateX(-50%);
  pointer-events: all;
  &:not(:last-child) {
    margin-bottom: 5px;
  }
  &:hover {
    cursor: pointer;
    background: #000;
  }
`;
