import { LEVEL_MAP_PERSPECTIVE } from '~const/world/level';
import { getIsometricDistance } from '~lib/dimension';
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

const EXPLOSION_RADIUS = 70;

export class EnemyExplosive extends Enemy {
  static SpawnWaveRange = [7];

  constructor(scene: IWorld, data: EnemyVariantData) {
    super(scene, {
      ...data,
      texture: EnemyTexture.EXPLOSIVE,
      multipliers: {
        health: 1.2,
        damage: 0.4,
        speed: 0.5,
      },
    });
  }

  public onDead() {
    this.createExplosion();
    super.onDead();
  }

  private createExplosion() {
    const position = this.getBottomFace();
    const d = EXPLOSION_RADIUS * 2;
    const area = this.scene.add.ellipse(position.x, position.y, d, d * LEVEL_MAP_PERSPECTIVE);

    area.setFillStyle(0xff0000, 0.25);

    this.scene.tweens.add({
      targets: area,
      alpha: 0.0,
      duration: 1000,
      onComplete: () => {
        area.destroy();
      },
    });

    this.scene.sound.play(EffectAudio.EXPLOSION);

    if (this.scene.game.isSettingEnabled(GameSettings.EFFECTS)) {
      new Effect(this.scene, {
        texture: EffectTexture.EXPLOSION,
        position: this.body.center,
        depth: this.depth + 1,
      });
    }

    let targets: IEnemyTarget[] = [this.scene.player];

    targets = targets.concat(this.scene.getEntities<IEnemy>(EntityType.ENEMY));
    targets = targets.concat(this.scene.getEntities<IBuilding>(EntityType.BUILDING));

    targets.forEach((target) => {
      if (target.active && target !== this) {
        const distance = getIsometricDistance(position, target.getBottomFace());

        if (distance <= EXPLOSION_RADIUS) {
          const multiplier = Math.min(1.0, 0.5 + (1 - (distance / EXPLOSION_RADIUS)));

          target.live.damage(this.damage * multiplier);
        }
      }
    });
  }
}
