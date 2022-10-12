import { World } from '~scene/world';
import { Enemy } from '~scene/world/entities/enemy';
import { EnemyVariantData, EnemyTexture } from '~type/enemy';

export class EnemyBat extends Enemy {
  constructor(scene: World, data: EnemyVariantData) {
    super(scene, {
      ...data,
      texture: EnemyTexture.BAT,
      health: 35,
      damage: 10,
      speed: 50,
      experienceMultiply: 0.5,
      scale: 1.5,
    });
  }
}
