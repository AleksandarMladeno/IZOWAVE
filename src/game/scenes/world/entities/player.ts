import Phaser from 'phaser';

import { DIFFICULTY } from '~const/world/difficulty';
import {
  PLAYER_TILE_SIZE, PLAYER_SKILLS, PLAYER_SUPERSKILLS, PLAYER_MOVEMENT_ANGLES, PLAYER_MOVEMENT_TARGET, PLAYER_MOVEMENT_KEYS,
} from '~const/world/entities/player';
import { Crystal } from '~entity/crystal';
import { Sprite } from '~entity/sprite';
import { registerAudioAssets, registerSpriteAssets } from '~lib/assets';
import { progressionLinear, progressionQuadratic } from '~lib/difficulty';
import { eachEntries } from '~lib/utils';
import { Particles } from '~scene/world/effects';
import { GameSettings } from '~type/game';
import { NoticeType } from '~type/screen';
import { TutorialStep, TutorialStepState } from '~type/tutorial';
import { IWorld, WorldEvents } from '~type/world';
import { IParticles, ParticlesTexture } from '~type/world/effects';
import { EntityType } from '~type/world/entities';
import { BuildingVariant } from '~type/world/entities/building';
import { IEnemy } from '~type/world/entities/npc/enemy';
import {
  PlayerTexture, PlayerAudio, PlayerData, IPlayer, PlayerSkill, PlayerSuperskill, PlayerSavePayload, MovementDirection,
} from '~type/world/entities/player';
import { TileType } from '~type/world/level';
import { WaveEvents } from '~type/world/wave';

export class Player extends Sprite implements IPlayer {
  private _experience: number = 0;

  public get experience() { return this._experience; }

  private set experience(v) { this._experience = v; }

  private _resources: number = DIFFICULTY.PLAYER_START_RESOURCES;

  public get resources() { return this._resources; }

  private set resources(v) { this._resources = v; }

  private _score: number = 0;

  public get score() { return this._score; }

  private set score(v) { this._score = v; }

  private _kills: number = 0;

  public get kills() { return this._kills; }

  private set kills(v) { this._kills = v; }

  private _upgradeLevel: Record<PlayerSkill, number> = {
    [PlayerSkill.MAX_HEALTH]: 1,
    [PlayerSkill.SPEED]: 1,
    [PlayerSkill.BUILD_AREA]: 1,
    [PlayerSkill.ATTACK_DAMAGE]: 1,
    [PlayerSkill.ATTACK_DISTANCE]: 1,
    [PlayerSkill.ATTACK_SPEED]: 1,
  };

  public get upgradeLevel() { return this._upgradeLevel; }

  private set upgradeLevel(v) { this._upgradeLevel = v; }

  private movementTarget: Nullable<MovementDirection> = null;

  private movementAngle: Nullable<number> = null;

  private dustEffect: Nullable<IParticles> = null;

  private _activeSuperskills: Partial<Record<PlayerSuperskill, boolean>> = {};

  public get activeSuperskills() { return this._activeSuperskills; }

  private set activeSuperskills(v) { this._activeSuperskills = v; }

  constructor(scene: IWorld, data: PlayerData) {
    super(scene, {
      ...data,
      texture: PlayerTexture.PLAYER,
      health: DIFFICULTY.PLAYER_HEALTH,
      speed: DIFFICULTY.PLAYER_SPEED,
    });
    scene.add.existing(this);

    this.gamut = PLAYER_TILE_SIZE.gamut;

    if (this.scene.game.device.os.desktop) {
      this.handleMovementByKeyboard();
    }

    this.registerAnimations();

    this.addDustEffect();
    this.addIndicator({
      color: 0xd0ff4f,
      value: () => this.live.health / this.live.maxHealth,
      size: 20,
    });

    this.body.setSize(14, 26);

    this.setTilesGroundCollision(true);
    this.setTilesCollision([
      TileType.MAP,
      TileType.BUILDING,
      TileType.CRYSTAL,
    ], (tile) => {
      if (tile instanceof Crystal) {
        tile.pickup();
      }
    });

    this.addCollider(EntityType.ENEMY, 'collider', (enemy: IEnemy) => {
      enemy.attack(this);
    });

    this.addCollider(EntityType.ENEMY, 'overlap', (enemy: IEnemy) => {
      enemy.overlapTarget();
    });

    this.scene.wave.on(WaveEvents.COMPLETE, this.onWaveComplete.bind(this));
  }

  public update() {
    super.update();

    if (this.live.isDead()) {
      return;
    }

    if (this.dustEffect) {
      this.dustEffect.emitter.setDepth(this.depth - 1);
    }

    this.updateMovement();
    this.updateVelocity();
  }

  public giveScore(amount: number) {
    if (this.live.isDead()) {
      return;
    }

    this.score += amount;
  }

  public giveExperience(amount: number) {
    if (this.live.isDead()) {
      return;
    }

    this.experience += Math.round(amount / this.scene.game.getDifficultyMultiplier());
  }

  public giveResources(amount: number) {
    if (this.live.isDead()) {
      return;
    }

    this.resources += amount;

    if (this.scene.game.tutorial.state(TutorialStep.RESOURCES) === TutorialStepState.IN_PROGRESS) {
      this.scene.game.tutorial.complete(TutorialStep.RESOURCES);
    }
  }

  public takeResources(amount: number) {
    this.resources -= amount;

    if (
      this.resources < DIFFICULTY.BUILDING_GENERATOR_COST
      && this.scene.builder.getBuildingsByVariant(BuildingVariant.GENERATOR).length === 0
    ) {
      this.scene.game.tutorial.start(TutorialStep.RESOURCES);
    }
  }

  public incrementKills() {
    this.kills++;
  }

  public getSuperskillCost(type: PlayerSuperskill) {
    return progressionLinear({
      defaultValue: PLAYER_SUPERSKILLS[type].cost,
      scale: DIFFICULTY.SUPERSKILL_COST_GROWTH,
      level: this.scene.wave.number,
    });
  }

  public useSuperskill(type: PlayerSuperskill) {
    if (this.activeSuperskills[type] || !this.scene.wave.isGoing) {
      return;
    }

    const cost = this.getSuperskillCost(type);

    if (this.resources < cost) {
      this.scene.game.screen.notice(NoticeType.ERROR, 'Not enough resources');

      return;
    }

    this.activeSuperskills[type] = true;

    this.takeResources(cost);

    this.scene.events.emit(WorldEvents.USE_SUPERSKILL, type);

    this.scene.time.addEvent({
      delay: PLAYER_SUPERSKILLS[type].duration,
      callback: () => {
        delete this.activeSuperskills[type];
      },
    });
  }

  public getExperienceToUpgrade(type: PlayerSkill) {
    return progressionQuadratic({
      defaultValue: PLAYER_SKILLS[type].experience,
      scale: DIFFICULTY.PLAYER_EXPERIENCE_TO_UPGRADE_GROWTH,
      level: this.upgradeLevel[type],
      roundTo: 10,
    });
  }

  private getUpgradeNextValue(type: PlayerSkill, level?: number): number {
    const nextLevel = level ?? this.upgradeLevel[type] + 1;

    switch (type) {
      case PlayerSkill.MAX_HEALTH: {
        return progressionQuadratic({
          defaultValue: DIFFICULTY.PLAYER_HEALTH,
          scale: DIFFICULTY.PLAYER_HEALTH_GROWTH,
          level: nextLevel,
          roundTo: 10,
        });
      }
      case PlayerSkill.SPEED: {
        return progressionQuadratic({
          defaultValue: DIFFICULTY.PLAYER_SPEED,
          scale: DIFFICULTY.PLAYER_SPEED_GROWTH,
          level: nextLevel,
        });
      }
      case PlayerSkill.BUILD_AREA: {
        return progressionQuadratic({
          defaultValue: DIFFICULTY.BUILDER_BUILD_AREA,
          scale: DIFFICULTY.BUILDER_BUILD_AREA_GROWTH,
          level: nextLevel,
        });
      }
      default: {
        return nextLevel;
      }
    }
  }

  public upgrade(type: PlayerSkill) {
    if (this.upgradeLevel[type] === PLAYER_SKILLS[type].maxLevel) {
      return;
    }

    const experience = this.getExperienceToUpgrade(type);

    if (this.experience < experience) {
      this.scene.game.screen.notice(NoticeType.ERROR, 'Not enough experience');

      return;
    }

    this.setSkillUpgrade(type, this.upgradeLevel[type] + 1);

    this.experience -= experience;

    this.scene.sound.play(PlayerAudio.UPGRADE);

    this.scene.game.tutorial.complete(TutorialStep.UPGRADE_SKILL);
  }

  private setSkillUpgrade(type: PlayerSkill, level: number) {
    const nextValue = this.getUpgradeNextValue(type, level);

    switch (type) {
      case PlayerSkill.MAX_HEALTH: {
        const addedHealth = nextValue - this.live.maxHealth;

        this.live.setMaxHealth(nextValue);
        this.live.addHealth(addedHealth);
        break;
      }
      case PlayerSkill.SPEED: {
        this.speed = nextValue;
        this.scene.assistant.speed = nextValue;
        break;
      }
      case PlayerSkill.BUILD_AREA: {
        this.scene.builder.setBuildAreaRadius(nextValue);
        break;
      }
    }

    this.upgradeLevel[type] = level;
  }

  public getSavePayload(): PlayerSavePayload {
    return {
      position: this.positionAtMatrix,
      score: this.score,
      experience: this.experience,
      resources: this.resources,
      kills: this.kills,
      health: this.live.health,
      upgradeLevel: this.upgradeLevel,
    };
  }

  public loadSavePayload(data: PlayerSavePayload) {
    this.score = data.score;
    this.experience = data.experience;
    this.resources = data.resources;
    this.kills = data.kills;

    eachEntries(data.upgradeLevel, (type, level) => {
      if (level > 1) {
        this.setSkillUpgrade(type, level);
      }
    });

    this.live.setHealth(data.health);
  }

  public onDamage() {
    this.scene.camera.shake();

    const audio = Phaser.Utils.Array.GetRandom([
      PlayerAudio.DAMAGE_1,
      PlayerAudio.DAMAGE_2,
      PlayerAudio.DAMAGE_3,
    ]);

    if (this.scene.game.sound.getAll(audio).length === 0) {
      this.scene.game.sound.play(audio);
    }

    super.onDamage();
  }

  public onDead() {
    this.scene.sound.play(PlayerAudio.DEAD);

    this.setVelocity(0, 0);
    this.stopMovement();

    this.scene.tweens.add({
      targets: [this, this.container],
      alpha: 0.0,
      duration: 250,
    });
  }

  private onWaveComplete(number: number) {
    const experience = progressionQuadratic({
      defaultValue: DIFFICULTY.WAVE_EXPERIENCE,
      scale: DIFFICULTY.WAVE_EXPERIENCE_GROWTH,
      level: number,
    });

    this.giveExperience(experience);
    this.giveScore(number * 10);
    this.live.heal();
  }

  private handleMovementByKeyboard() {
    const keysState: Partial<Record<MovementDirection, boolean>> = {};

    const toggleKeyState = (key: string, state: boolean) => {
      if (!PLAYER_MOVEMENT_KEYS[key]) {
        return;
      }

      keysState[PLAYER_MOVEMENT_KEYS[key]] = state;

      const result = [
        [MovementDirection.LEFT, MovementDirection.RIGHT],
        [MovementDirection.UP, MovementDirection.DOWN],
      ].reduce((list, line) => {
        const direction = line.find((section) => keysState[section]);

        return direction ? list.concat(direction) : list;
      }, []);

      this.movementTarget = result.length > 0 ? result.join('_') as MovementDirection : null;
    };

    this.scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, (event: KeyboardEvent) => {
      toggleKeyState(event.key, true);
    });

    this.scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_UP, (event: KeyboardEvent) => {
      toggleKeyState(event.key, false);
    });
  }

  private updateVelocity() {
    if (this.movementAngle === null) {
      this.setVelocity(0, 0);

      return;
    }

    const collide = this.handleCollide(this.movementAngle);

    if (collide) {
      this.setVelocity(0, 0);

      return;
    }

    const friction = this.currentBiome?.friction ?? 1;
    const speed = this.speed / friction;
    const velocity = this.scene.physics.velocityFromAngle(this.movementAngle, speed);

    this.setVelocity(velocity.x, velocity.y);
  }

  private updateMovement() {
    if (this.movementTarget === null) {
      if (this.movementAngle !== null) {
        this.stopMovement();
      }
    } else {
      const newDirection = PLAYER_MOVEMENT_ANGLES[this.movementTarget];

      if (this.movementAngle === null) {
        this.startMovement(newDirection);
      } else {
        this.setMovementAngle(newDirection);
      }
    }
  }

  private startMovement(angle: number) {
    if (this.movementTarget === null) {
      return;
    }

    this.movementAngle = angle;

    this.anims.play(this.movementTarget);

    if (this.dustEffect) {
      this.dustEffect.emitter.start();
    }

    this.scene.game.sound.play(PlayerAudio.WALK, {
      loop: true,
      rate: 1.8,
    });
  }

  public setMovementTarget(angle: Nullable<number>) {
    if (angle === null) {
      this.movementTarget = null;
    } else {
      const section = Math.round(angle / 45) % 8;

      this.movementTarget = PLAYER_MOVEMENT_TARGET[section];
    }
  }

  private setMovementAngle(angle: number) {
    if (
      this.movementTarget === null
      || this.movementAngle === angle
    ) {
      return;
    }

    this.movementAngle = angle;
    this.anims.play(this.movementTarget);
  }

  private stopMovement() {
    if (this.movementAngle === null) {
      return;
    }

    this.movementAngle = null;

    if (this.anims.currentAnim) {
      this.anims.setProgress(0);
      this.anims.stop();
    }

    if (this.dustEffect) {
      this.dustEffect.emitter.stop();
    }

    this.scene.sound.stopByKey(PlayerAudio.WALK);
  }

  private addDustEffect() {
    if (!this.scene.game.isSettingEnabled(GameSettings.EFFECTS)) {
      return;
    }

    this.dustEffect = new Particles(this, {
      key: 'dust',
      texture: ParticlesTexture.BIT,
      params: {
        follow: this,
        followOffset: {
          x: 0,
          y: -this.gamut * this.scaleY * 0.5,
        },
        lifespan: { min: 150, max: 300 },
        scale: 0.6,
        speed: 10,
        frequency: 150,
        alpha: { start: 0.75, end: 0.0 },
        emitting: false,
      },
    });
  }

  private registerAnimations() {
    Object.values(MovementDirection).forEach((key, index) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(PlayerTexture.PLAYER, {
          start: index * 4,
          end: (index + 1) * 4 - 1,
        }),
        frameRate: 8,
        repeat: -1,
      });
    });
  }
}

registerAudioAssets(PlayerAudio);
registerSpriteAssets(PlayerTexture, PLAYER_TILE_SIZE);
