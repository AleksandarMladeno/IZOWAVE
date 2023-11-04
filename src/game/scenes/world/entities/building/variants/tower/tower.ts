import { DIFFICULTY } from '~const/world/difficulty';
import { Building } from '~entity/building';
import { Analytics } from '~lib/analytics';
import { getClosestByIsometricDistance } from '~lib/dimension';
import { progressionLinear } from '~lib/progression';
import { Tutorial } from '~lib/tutorial';
import { TutorialStep } from '~type/tutorial';
import { IWorld } from '~type/world';
import { EntityType } from '~type/world/entities';
import {
  BuildingData,
  BuildingIcon,
  BuildingParam,
  BuildingVariant,
  IBuilding,
  IBuildingAmmunition,
  IBuildingTower,
  BuildingAudio,
  BuildingSavePayload,
  BuildingEvents,
  IBuildingBooster,
} from '~type/world/entities/building';
import { IEnemy } from '~type/world/entities/npc/enemy';
import { PlayerSuperskill } from '~type/world/entities/player';
import { IShot, ShotParams } from '~type/world/entities/shot';

export class BuildingTower extends Building implements IBuildingTower {
  private shot: IShot;

  private shotDefaultParams: ShotParams;

  private needReload: boolean = false;

  private power: number = 1.0;

  private _ammo: number = DIFFICULTY.BUIDLING_TOWER_AMMO_AMOUNT;

  public get ammo() { return this._ammo; }

  private set ammo(v) { this._ammo = v; }

  constructor(scene: IWorld, data: BuildingData, shot: IShot) {
    super(scene, data);

    shot.setInitiator(this, () => this.getTopFace());
    this.shot = shot;
    this.shotDefaultParams = shot.params;

    this.handleBuildingRelease();

    this.calculatePower();

    this.on(BuildingEvents.UPGRADE, this.onUpgrade.bind(this));
  }

  public update() {
    super.update();

    try {
      if (this.isCanAttack()) {
        this.attack();
      }
    } catch (error) {
      Analytics.TrackWarn('Failed tower building update', error as TypeError);
    }
  }

  public getInfo() {
    const info: BuildingParam[] = [];
    const params = this.getShotCurrentParams();

    if (params.damage) {
      info.push({
        label: 'BUILDING_DAMAGE',
        icon: BuildingIcon.DAMAGE,
        value: Math.round(params.damage * this.power),
      });
    }

    if (params.freeze) {
      info.push({
        label: 'BUILDING_FREEZE',
        icon: BuildingIcon.FREEZE,
        value: `${((params.freeze * this.power) / 1000).toFixed(1)} s`,
      });
    }

    if (params.speed) {
      info.push({
        label: 'BUILDING_SPEED',
        icon: BuildingIcon.SPEED,
        value: params.speed,
      });
    }

    info.push({
      label: 'BUILDING_AMMO',
      icon: BuildingIcon.AMMO,
      attention: (this.ammo === 0),
      value: `${this.ammo}/${DIFFICULTY.BUIDLING_TOWER_AMMO_AMOUNT}`,
    });

    return super.getInfo().concat(info);
  }

  public getTopFace() {
    const position = super.getTopFace();

    position.y -= 5;

    return position;
  }

  private isCanAttack() {
    return (
      this.ammo > 0
      && this.isActionAllowed()
      && !this.scene.player.live.isDead()
    );
  }

  private attack() {
    const target = this.getTarget();

    if (!target) {
      return;
    }

    this.shoot(target);
    this.pauseActions();

    this.ammo--;

    if (this.ammo === 0) {
      this.reload();
    }
  }

  private getShotCurrentParams() {
    const params: ShotParams = {
      maxDistance: this.getActionsRadius(),
    };

    if (this.shotDefaultParams.speed) {
      params.speed = progressionLinear({
        defaultValue: this.shotDefaultParams.speed,
        scale: DIFFICULTY.BUIDLING_TOWER_SHOT_SPEED_GROWTH,
        level: this.upgradeLevel,
      });
    }

    if (this.shotDefaultParams.damage) {
      const rage = this.scene.player.activeSuperskills[PlayerSuperskill.RAGE];

      params.damage = progressionLinear({
        defaultValue: this.shotDefaultParams.damage,
        scale: DIFFICULTY.BUIDLING_TOWER_SHOT_DAMAGE_GROWTH,
        level: this.upgradeLevel,
      }) * (rage ? 2 : 1);
    }

    if (this.shotDefaultParams.freeze) {
      params.freeze = progressionLinear({
        defaultValue: this.shotDefaultParams.freeze,
        scale: DIFFICULTY.BUIDLING_TOWER_SHOT_FREEZE_GROWTH,
        level: this.upgradeLevel,
      });
    }

    return params;
  }

  private getAmmunition() {
    const ammunitions = this.scene.builder.getBuildingsByVariant<IBuildingAmmunition>(BuildingVariant.AMMUNITION)
      .filter((building) => (building.ammo > 0 && building.actionsAreaContains(this.getBottomFace())));

    if (ammunitions.length === 0) {
      return null;
    }

    const priorityAmmunition = ammunitions.reduce((max, current) => (
      max.ammo > current.ammo ? max : current
    ));

    return priorityAmmunition;
  }

  private reload() {
    const ammunition = this.getAmmunition();

    if (ammunition) {
      this.ammo += ammunition.use(DIFFICULTY.BUIDLING_TOWER_AMMO_AMOUNT);

      Tutorial.Complete(TutorialStep.RELOAD_TOWER);

      if (this.needReload) {
        this.removeAlertIcon();
        this.needReload = false;

        if (this.scene.game.sound.getAll(BuildingAudio.RELOAD).length === 0) {
          this.scene.game.sound.play(BuildingAudio.RELOAD);
        }
      }
    } else if (!this.needReload) {
      this.addAlertIcon();
      this.needReload = true;

      if (this.scene.game.sound.getAll(BuildingAudio.OVER).length === 0) {
        this.scene.game.sound.play(BuildingAudio.OVER);
      }

      Tutorial.Start(TutorialStep.RELOAD_TOWER);
    }
  }

  private getTarget() {
    const enemies = this.scene.getEntities<IEnemy>(EntityType.ENEMY).filter((enemy) => {
      if (
        enemy.alpha < 1.0
        || enemy.live.isDead()
        || (this.shotDefaultParams.freeze && enemy.isFreezed(true))
      ) {
        return false;
      }

      const position = enemy.getBottomFace();

      return (
        this.actionsAreaContains(position)
        && !this.scene.level.hasTilesBetweenPositions(position, this.getBottomFace())
      );
    });

    return getClosestByIsometricDistance(enemies, this);
  }

  private shoot(target: IEnemy) {
    const params = this.getShotCurrentParams();

    if (this.power > 1.0) {
      if (params.damage) {
        params.damage *= this.power;
      }
      if (params.freeze) {
        params.freeze *= this.power;
      }
    }

    this.shot.shoot(target, params);
  }

  private getBooster() {
    const boosters = this.scene.builder.getBuildingsByVariant<IBuildingBooster>(BuildingVariant.BOOSTER)
      .filter((building) => building.actionsAreaContains(this.getBottomFace()));

    if (boosters.length === 0) {
      return null;
    }

    const priorityBooster = boosters.reduce((max, current) => (
      max.power > current.power ? max : current
    ));

    return priorityBooster;
  }

  private calculatePower() {
    const booster = this.getBooster();

    this.power = 1.0 + (booster?.power ?? 0.0);
  }

  private onUpgrade() {
    this.ammo = DIFFICULTY.BUIDLING_TOWER_AMMO_AMOUNT;

    if (this.needReload) {
      this.removeAlertIcon();
      this.needReload = false;
    }
  }

  private handleBuildingRelease() {
    const handler = (building: IBuilding) => {
      if (building.variant === BuildingVariant.AMMUNITION) {
        if (this.needReload) {
          this.reload();
        }
      } else if (building.variant === BuildingVariant.BOOSTER) {
        this.calculatePower();
      }
    };

    const buidingsGroup = this.scene.getEntitiesGroup(EntityType.BUILDING);

    buidingsGroup.on(BuildingEvents.CREATE, handler);
    buidingsGroup.on(BuildingEvents.UPGRADE, handler);
    buidingsGroup.on(BuildingEvents.BUY_AMMO, handler);
    buidingsGroup.on(BuildingEvents.BREAK, handler);

    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      buidingsGroup.off(BuildingEvents.CREATE, handler);
      buidingsGroup.off(BuildingEvents.UPGRADE, handler);
      buidingsGroup.off(BuildingEvents.BUY_AMMO, handler);
      buidingsGroup.off(BuildingEvents.BREAK, handler);
    });
  }

  public getSavePayload() {
    return {
      ...super.getSavePayload(),
      ammo: this.ammo,
    };
  }

  public loadSavePayload(data: BuildingSavePayload) {
    super.loadSavePayload(data);

    if (data.ammo !== undefined) {
      this.ammo = data.ammo;
    }
  }
}
