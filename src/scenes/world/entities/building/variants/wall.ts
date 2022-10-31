import { World } from '~scene/world';
import { ScreenIcon } from '~type/screen';
import {
  BuildingEvents, BuildingVariant, BuildingTexture, BuildingParamItem,
} from '~type/world/entities/building';

import { Building } from '../building';

export class BuildingWall extends Building {
  static Name = 'Wall';

  static Description = 'Wall with more health to defend other buildings';

  static Params: BuildingParamItem[] = [
    { label: 'HEALTH', value: 2000, icon: ScreenIcon.HEALTH },
  ];

  static Texture = BuildingTexture.WALL;

  static Cost = 15;

  static Health = 2000;

  /**
   * Building variant constructor.
   */
  constructor(scene: World, positionAtMatrix: Phaser.Types.Math.Vector2Like) {
    super(scene, {
      positionAtMatrix,
      variant: BuildingVariant.WALL,
      health: BuildingWall.Health,
      texture: BuildingWall.Texture,
    });

    this.on(BuildingEvents.UPGRADE, this.upgradeHealth, this);
  }

  /**
   * Update health by upgrade level.
   *
   * @param level - Upgrade level
   */
  private upgradeHealth(level: number) {
    this.live.setMaxHealth(BuildingWall.Health * level);
  }
}
