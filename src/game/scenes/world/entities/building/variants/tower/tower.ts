import { CONTROL_KEY } from '~const/controls';
import { INTERFACE_TEXT_COLOR } from '~const/interface';
import { DIFFICULTY } from '~const/world/difficulty';
import { Building } from '~entity/building';
import { BuildingAmmunition } from '~entity/building/variants/ammunition';
import { Enemy } from '~entity/npc/variants/enemy';
import { calcGrowth, selectClosest } from '~lib/utils';
import { World } from '~scene/world';
import { ScreenIcon } from '~type/screen';
import { NoticeType } from '~type/screen/notice';
import { TutorialStep } from '~type/tutorial';
import {
  BuildingAction, BuildingAudio, BuildingData, BuildingParamItem, BuildingVariant,
} from '~type/world/entities/building';
import { IShot, ShotParams } from '~type/world/entities/shot';

export class BuildingTower extends Building {
  /**
   * Tower shot item.
   */
  readonly shot: IShot;

  /**
   * Ammo left in clip.
   */
  private ammoLeft: number = DIFFICULTY.BUIDLING_TOWER_AMMO_AMOUNT;

  /**
   * Building variant constructor.
   */
  constructor(scene: World, data: BuildingData, shot: IShot) {
    super(scene, data);

    shot.setInitiator(this);
    this.shot = shot;

    scene.input.keyboard.on(CONTROL_KEY.BUILDING_RELOAD, () => {
      if (this.isFocused) {
        this.reload();
      }
    });
  }

  /**
   * Add ammo left and reload to building info.
   */
  public getInfo(): BuildingParamItem[] {
    const info = super.getInfo();
    const params = this.getShotCurrentParams();

    if (params.damage) {
      info.push({
        label: 'DAMAGE',
        icon: ScreenIcon.DAMAGE,
        value: params.damage,
      });
    }

    if (params.freeze) {
      info.push({
        label: 'FREEZE',
        icon: ScreenIcon.DAMAGE,
        value: (params.freeze / 1000).toFixed(1),
      });
    }

    if (params.speed) {
      info.push({
        label: 'SPEED',
        icon: ScreenIcon.SPEED,
        value: params.speed,
      });
    }

    info.push({
      label: 'AMMO',
      icon: ScreenIcon.AMMO,
      color: (this.ammoLeft === 0)
        ? INTERFACE_TEXT_COLOR.WARN
        : undefined,
      value: `${this.ammoLeft}/${this.getMaxAmmo()}`,
    });

    return info;
  }

  /**
   * Add reload to building actions.
   */
  public getActions(): BuildingAction[] {
    const actions = super.getActions();

    if (this.ammoLeft < this.getMaxAmmo()) {
      actions.push({
        label: 'RELOAD',
        onClick: () => this.reload(),
      });
    }

    return actions;
  }

  /**
   * Find target and shoot.
   */
  public update() {
    super.update();

    if (
      this.ammoLeft === 0
      || !this.isAllowAction()
      || this.scene.player.live.isDead()
    ) {
      return;
    }

    const target = this.getTarget();

    if (!target) {
      return;
    }

    this.shoot(target);
    this.pauseActions();

    this.ammoLeft--;

    if (this.ammoLeft === 0) {
      this.alert = true;

      this.scene.game.tutorial.beg(TutorialStep.RELOAD_BUILDING);
    }
  }

  /**
   * Get shot params.
   */
  private getShotCurrentParams(level?: number) {
    const params: ShotParams = {
      maxDistance: this.getActionsRadius(),
    };

    if (this.shot.params.speed) {
      params.speed = calcGrowth(
        this.shot.params.speed,
        DIFFICULTY.BUIDLING_TOWER_SHOT_SPEED_GROWTH,
        level || this.upgradeLevel,
      );
    }

    if (this.shot.params.damage) {
      params.damage = calcGrowth(
        this.shot.params.damage,
        DIFFICULTY.BUIDLING_TOWER_SHOT_DAMAGE_GROWTH,
        level || this.upgradeLevel,
      );
    }

    if (this.shot.params.freeze) {
      params.freeze = calcGrowth(
        this.shot.params.freeze,
        DIFFICULTY.BUIDLING_TOWER_SHOT_FREEZE_GROWTH,
        level || this.upgradeLevel,
      );
    }

    return params;
  }

  /**
   * Get nearby ammunition.
   */
  private getAmmunition(): BuildingAmmunition {
    const ammunitions = <BuildingAmmunition[]> this.scene.selectBuildings(BuildingVariant.AMMUNITION);
    const nearby = ammunitions.filter((building: Building) => building.actionsAreaContains(this));

    if (nearby.length === 0) {
      return null;
    }

    const ammunition = nearby.sort((a, b) => (b.amountLeft - a.amountLeft))[0];

    if (ammunition.amountLeft === 0) {
      return null;
    }

    return ammunition;
  }

  /**
   * Reload ammo.
   */
  private reload() {
    const needAmmo = this.getMaxAmmo() - this.ammoLeft;

    if (needAmmo <= 0) {
      return;
    }

    const ammunition = this.getAmmunition();

    if (!ammunition) {
      this.scene.game.screen.message(NoticeType.ERROR, 'NO AMMUNITION NEARBY');

      return;
    }

    const ammo = ammunition.use(needAmmo);

    this.ammoLeft += ammo;

    this.scene.sound.play(BuildingAudio.RELOAD);
    this.alert = false;

    this.scene.game.tutorial.end(TutorialStep.RELOAD_BUILDING);
  }

  /**
   * Get maximum ammo in clip.
   */
  private getMaxAmmo(): number {
    return DIFFICULTY.BUIDLING_TOWER_AMMO_AMOUNT * this.upgradeLevel;
  }

  /**
   * Find nearby enemy for shoot.
   */
  private getTarget(): Enemy {
    const enemies = (<Enemy[]> this.scene.entityGroups.enemies.getChildren()).filter((enemy) => (
      !enemy.live.isDead()
      && this.actionsAreaContains(enemy)
    ));

    if (enemies.length === 0) {
      return null;
    }

    return selectClosest(enemies, this)[0];
  }

  /**
   * Shoot to enemy.
   *
   * @param target - Enemy
   */
  private shoot(target: Enemy) {
    this.shot.params = this.getShotCurrentParams();
    this.shot.shoot(target);
  }
}