import { LEVEL_TILE_SIZE } from '~const/world/level';
import { getIsometricDistance } from '~lib/utils';
import { Effect } from '~scene/world/effects';
import { GameSettings } from '~type/game';
import { IWorld } from '~type/world';
import { EffectAudio, EffectTexture } from '~type/world/effects';
import { EntityType } from '~type/world/entities';
import { IBuilding } from '~type/world/entities/building';
import {
  EnemyVariantData, EnemyTexture, IEnemyTarget, IEnemy,
} from '~type/world/entities/npc/enemy';

import { Enemy } from '../enemy';

export class EnemyExplosive extends Enemy {
  static SpawnWaveRange = [7];

  constructor(scene: IWorld, data: EnemyVariantData) {
    super(scene, {
      ...data,
      texture: EnemyTexture.EXPLOSIVE,
      multipliers: {
        health: 0.8,
        damage: 0.4,
        speed: 0.5,
      },
    });
  }

  public onDead() {
    this.createExplosion(70);
    super.onDead();
  }

  private createExplosion(radius: number) {
    const position = this.getPositionOnGround();
    const area = this.scene.add.ellipse(position.x, position.y, radius * 2, radius * 2 * LEVEL_TILE_SIZE.persperctive);

    area.setFillStyle(0xff0000, 0.25);

    this.scene.tweens.add({
      targets: area,
      alpha: 0.0,
      duration: 1000,
      onComplete: () => {
        area.destroy();
      },
    });

    let targets: IEnemyTarget[] = [this.scene.player];

    targets = targets.concat(this.scene.getEntities<IEnemy>(EntityType.ENEMY));
    targets = targets.concat(this.scene.getEntities<IBuilding>(EntityType.BUILDING));

    targets.forEach((target) => {
      if (target !== this) {
        const distance = getIsometricDistance(position, target.getPositionOnGround());

        if (distance <= radius) {
          const multiplier = Math.min(1.0, 0.5 + (1 - (distance / radius)));

          target.live.damage(this.damage * multiplier);
        }
      }
    });

    this.scene.sound.play(EffectAudio.EXPLOSION);

    if (this.scene.game.isSettingEnabled(GameSettings.EFFECTS)) {
      new Effect(this.scene, {
        texture: EffectTexture.EXPLOSION,
        position,
        depth: this.depth + 1,
      });
    }
  }
}