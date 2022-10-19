import Phaser from 'phaser';
import { ShotTexture, ShotType } from '~type/world/entities/shot';
import { Resources, ResourceType } from '~type/world/resources';

export enum BuildingEvents {
  UPGRADE = 'upgrade',
}

export enum BuildingVariant {
  WALL = 'WALL',
  TOWER_FIRE = 'TOWER_FIRE',
  TOWER_LAZER = 'TOWER_LAZER',
  TOWER_FROZEN = 'TOWER_FROZEN',
  MINE_BRONZE = 'MINE_BRONZE',
  MINE_SILVER = 'MINE_SILVER',
  MINE_GOLD = 'MINE_GOLD',
  AMMUNITION = 'AMMUNITION',
  MEDIC = 'MEDIC',
}

export enum BuildingTexture {
  WALL = 'build/wall',
  TOWER_FIRE = 'build/tower_fire',
  TOWER_FROZEN = 'build/tower_frozen',
  TOWER_LAZER = 'build/tower_lazer',
  MINE_BRONZE = 'build/mine_bronze',
  MINE_SILVER = 'build/mine_silver',
  MINE_GOLD = 'build/mine_gold',
  AMMUNITION = 'build/ammunition',
  MEDIC = 'build/medic',
}

export type BuildingActionsParams = {
  radius?: number
  pause?: number
};

export type BuildingData = {
  variant: BuildingVariant
  health: number
  positionAtMatrix: Phaser.Types.Math.Vector2Like
  texture: BuildingTexture
  actions?: BuildingActionsParams
  upgradeCost: Resources
};

export type BuildingDescriptionItem = {
  text: string
  icon?: number
  type?: 'text' | 'param'
  post?: string
  color?: string
};

export interface BuildingInstance {
  Name: string
  Description: BuildingDescriptionItem[]
  Texture: BuildingTexture
  Cost: Resources
  UpgradeCost: Resources
  Health: number
  Limit?: number
}

export type BuildingTowerShotParams = {
  speed?: number
  damage?: number
  freeze?: number
};

export type BuildingTowerShotData = {
  type: ShotType
  texture?: ShotTexture
  glowColor?: number
  params: BuildingTowerShotParams
};

export type BuildingTowerData = BuildingData & {
  shotData: BuildingTowerShotData
};

export type BuildingMineData = BuildingData & {
  resourceType: ResourceType
};
