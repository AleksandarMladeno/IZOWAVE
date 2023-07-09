import EventEmitter from 'events';

import Phaser from 'phaser';

import { DIFFICULTY } from '~const/world/difficulty';
import { BUILDINGS } from '~const/world/entities/buildings';
import { LEVEL_TILE_SIZE } from '~const/world/level';
import { equalPositions } from '~lib/utils';
import { Level } from '~scene/world/level';
import { NoticeType } from '~type/screen';
import { TutorialStep, TutorialStepState } from '~type/tutorial';
import { IWorld } from '~type/world';
import { BuilderEvents, IBuilder } from '~type/world/builder';
import { BuildingAudio, BuildingVariant } from '~type/world/entities/building';
import { BiomeType, TileType, Vector2D } from '~type/world/level';

export class Builder extends EventEmitter implements IBuilder {
  readonly scene: IWorld;

  private _isBuild: boolean = false;

  public get isBuild() { return this._isBuild; }

  private set isBuild(v) { this._isBuild = v; }

  private buildArea: Nullable<Phaser.GameObjects.Ellipse> = null;

  private buildingPreview: Nullable<Phaser.GameObjects.Image> = null;

  private _variant: Nullable<BuildingVariant> = null;

  public get variant() { return this._variant; }

  private set variant(v) { this._variant = v; }

  private _radius: number = DIFFICULTY.BUILDER_BUILD_AREA;

  public get radius() { return this._radius; }

  private set radius(v) { this._radius = v; }

  constructor(scene: IWorld) {
    super();

    this.scene = scene;

    this.setMaxListeners(0);

    // TODO: Add event to check ui ready state
    setTimeout(() => {
      this.scene.game.tutorial.start(TutorialStep.BUILD_TOWER_FIRE);
    }, 150);

    this.scene.input.keyboard.on(Phaser.Input.Keyboard.Events.ANY_KEY_UP, (e: KeyboardEvent) => {
      if (Number(e.key)) {
        this.switchBuildingVariant(Number(e.key) - 1);
      }
    });

    this.scene.game.tutorial.bind(TutorialStep.BUILD_GENERATOR, {
      end: () => {
        this.scene.setTimePause(false);
        this.scene.game.tutorial.start(TutorialStep.UNSET_BUILDING);
      },
    });
  }

  public update() {
    if (this.isCanBuild()) {
      if (!this.isBuild) {
        this.openBuilder();
      }
    } else if (this.isBuild) {
      this.closeBuilder();
    }
  }

  public setBuildingVariant(variant: BuildingVariant) {
    if (this.variant === variant) {
      return;
    }

    if (!this.isBuildingAllowByTutorial(variant)) {
      return;
    }

    const BuildingInstance = BUILDINGS[variant];

    if (!this.isBuildingAllowByWave(variant)) {
      // eslint-disable-next-line max-len
      this.scene.game.screen.notice(NoticeType.ERROR, `${BuildingInstance.Name} WILL BE AVAILABLE ON ${BuildingInstance.AllowByWave} WAVE`);

      return;
    }

    if (this.isBuildingLimitReached(variant)) {
      this.scene.game.screen.notice(NoticeType.ERROR, `YOU HAVE MAXIMUM ${BuildingInstance.Name}`);

      return;
    }

    this.scene.sound.play(BuildingAudio.SELECT);

    this.variant = variant;

    if (this.buildingPreview) {
      this.buildingPreview.setTexture(BuildingInstance.Texture);
    }
  }

  public unsetBuildingVariant() {
    if (this.variant === null) {
      return;
    }

    this.scene.sound.play(BuildingAudio.UNSELECT);
    this.scene.game.tutorial.complete(TutorialStep.UNSET_BUILDING);

    this.clearBuildingVariant();
  }

  public addFoundation(position: Vector2D) {
    const newBiome = Level.GetBiome(BiomeType.RUBBLE);

    if (!newBiome) {
      return;
    }

    for (let y = position.y - 1; y <= position.y + 1; y++) {
      for (let x = position.x - 1; x <= position.x + 1; x++) {
        const tileGround = this.scene.level.getTile({ x, y, z: 0 });

        if (
          tileGround
          && tileGround.biome.solid
          && tileGround.biome.type !== BiomeType.RUBBLE
        ) {
          // Replace biome
          const frame = Array.isArray(newBiome.tileIndex)
            ? Phaser.Math.Between(...newBiome.tileIndex)
            : newBiome.tileIndex;

          tileGround.setFrame(frame);
          tileGround.clearTint();
          tileGround.biome = newBiome;

          // Remove trees
          const tile = this.scene.level.getTileWithType({ x, y, z: 1 }, TileType.TREE);

          if (tile) {
            tile.destroy();
          }

          // Remove effects
          if (tileGround.mapEffects) {
            tileGround.mapEffects.forEach((effect) => {
              effect.destroy();
            });
            tileGround.mapEffects = [];
          }
        }
      }
    }
  }

  public isBuildingAllowByTutorial(variant: BuildingVariant) {
    for (const [step, allowedVariant] of <[TutorialStep, BuildingVariant][]> [
      [TutorialStep.BUILD_TOWER_FIRE, BuildingVariant.TOWER_FIRE],
      [TutorialStep.BUILD_GENERATOR, BuildingVariant.GENERATOR],
    ]) {
      if (this.scene.game.tutorial.state(step) === TutorialStepState.IN_PROGRESS) {
        return (variant === allowedVariant);
      }
    }

    return true;
  }

  public isBuildingAllowByWave(variant: BuildingVariant) {
    const waveAllowed = BUILDINGS[variant].AllowByWave;

    if (waveAllowed) {
      return (waveAllowed <= this.scene.wave.number);
    }

    return true;
  }

  public getBuildingLimit(variant: BuildingVariant): Nullable<number> {
    const limit = BUILDINGS[variant].Limit;

    return limit ? limit * this.scene.wave.getSeason() : null;
  }

  private getAssumedPosition() {
    return Level.ToMatrixPosition({
      x: this.scene.input.activePointer.worldX,
      y: this.scene.input.activePointer.worldY,
    });
  }

  private onMouseClick(pointer: Phaser.Input.Pointer) {
    if (pointer.button === 0) {
      this.build();
    } else if (pointer.button === 2) {
      this.unsetBuildingVariant();
    }
  }

  private onMouseMove() {
    this.updateBuildingPreview();
  }

  private openBuilder() {
    if (this.isBuild) {
      return;
    }

    this.createBuildArea();
    this.createBuildingPreview();

    this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.onMouseClick, this);
    this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMouseMove, this);

    this.isBuild = true;

    this.emit(BuilderEvents.BUILD_START);
  }

  private closeBuilder() {
    if (!this.isBuild) {
      return;
    }

    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onMouseClick);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMouseMove);

    this.destroyBuildingPreview();
    this.destroyBuildArea();

    this.isBuild = false;

    this.emit(BuilderEvents.BUILD_STOP);
  }

  private clearBuildingVariant() {
    this.closeBuilder();
    this.variant = null;
  }

  private switchBuildingVariant(index: number) {
    const variant = Object.values(BuildingVariant)[index];

    if (variant) {
      if (this.variant === variant) {
        this.unsetBuildingVariant();
      } else {
        this.setBuildingVariant(variant);
      }
    }
  }

  private isCanBuild() {
    return (
      this.variant !== null
      && !this.scene.player.live.isDead()
      && this.scene.player.isStopped()
    );
  }

  private isAllowBuild() {
    const positionAtMatrix = this.getAssumedPosition();

    // Pointer in build area
    const positionAtWorldDown = Level.ToWorldPosition({ ...positionAtMatrix, z: 0 });
    const offset = this.buildArea.getTopLeft();
    const inArea = this.buildArea.geom.contains(
      positionAtWorldDown.x - offset.x,
      positionAtWorldDown.y - offset.y,
    );

    if (!inArea) {
      return false;
    }

    // Pointer biome is solid
    const tileGround = this.scene.level.getTile({ ...positionAtMatrix, z: 0 });

    if (!tileGround?.biome?.solid) {
      return false;
    }

    // Pointer is not contains player or other buildings
    const playerPositionsAtMatrix = this.scene.player.getAllPositionsAtMatrix();
    const isFree = (
      this.scene.level.isFreePoint({ ...positionAtMatrix, z: 1 })
      && !playerPositionsAtMatrix.some((point) => equalPositions(positionAtMatrix, point))
    );

    if (!isFree) {
      return false;
    }

    return true;
  }

  private build() {
    if (
      !this.buildingPreview.visible
      || !this.isAllowBuild()
    ) {
      return;
    }

    const BuildingInstance = BUILDINGS[this.variant];

    if (this.scene.player.resources < BuildingInstance.Cost) {
      this.scene.game.screen.notice(NoticeType.ERROR, 'NOT ENOUGH RESOURCES');

      return;
    }

    new BuildingInstance(this.scene, {
      positionAtMatrix: this.getAssumedPosition(),
    });

    this.scene.player.takeResources(BuildingInstance.Cost);
    this.scene.player.giveExperience(DIFFICULTY.BUILDING_BUILD_EXPERIENCE);

    if (this.isBuildingLimitReached(this.variant)) {
      this.clearBuildingVariant();
    }

    this.scene.sound.play(BuildingAudio.BUILD);

    if (this.scene.game.tutorial.state(TutorialStep.BUILD_TOWER_FIRE) === TutorialStepState.IN_PROGRESS) {
      this.scene.game.tutorial.complete(TutorialStep.BUILD_TOWER_FIRE);
      this.scene.game.tutorial.start(TutorialStep.BUILD_GENERATOR);
    } else if (this.scene.game.tutorial.state(TutorialStep.BUILD_GENERATOR) === TutorialStepState.IN_PROGRESS) {
      this.scene.game.tutorial.complete(TutorialStep.BUILD_GENERATOR);
      this.scene.game.tutorial.start(TutorialStep.WAVE_TIMELEFT);
    }
  }

  private isBuildingLimitReached(variant: BuildingVariant) {
    const limit = this.getBuildingLimit(variant);

    if (limit !== null) {
      return (this.scene.getBuildingsByVariant(variant).length >= limit);
    }

    return false;
  }

  private createBuildArea() {
    const position = this.scene.player.getPositionOnGround();

    this.buildArea = this.scene.add.ellipse(position.x, position.y);
    this.buildArea.setStrokeStyle(2, 0xffffff, 0.4);

    this.updateBuildArea();
  }

  public setBuildAreaRadius(radius: number) {
    this.radius = radius;

    if (this.buildArea) {
      this.updateBuildArea();
    }
  }

  private updateBuildArea() {
    this.buildArea.setSize(
      this.radius * 2,
      this.radius * 2 * LEVEL_TILE_SIZE.persperctive,
    );
    this.buildArea.updateDisplayOrigin();

    const depth = Level.GetDepth(this.buildArea.y, 0, this.buildArea.displayHeight);

    this.buildArea.setDepth(depth);
  }

  private destroyBuildArea() {
    this.buildArea.destroy();
    this.buildArea = null;
  }

  private createBuildingPreview() {
    const BuildingInstance = BUILDINGS[this.variant];

    this.buildingPreview = this.scene.add.image(0, 0, BuildingInstance.Texture);
    this.buildingPreview.setOrigin(0.5, LEVEL_TILE_SIZE.origin);

    this.updateBuildingPreview();
  }

  private updateBuildingPreview() {
    const positionAtMatrix = this.getAssumedPosition();
    const isVisibleTile = this.scene.level.isVisibleTile({ ...positionAtMatrix, z: 0 });

    this.buildingPreview.setVisible(isVisibleTile);

    if (isVisibleTile) {
      const tilePosition = { ...positionAtMatrix, z: 1 };
      const positionAtWorld = Level.ToWorldPosition(tilePosition);
      const depth = Level.GetTileDepth(positionAtWorld.y, tilePosition.z);

      this.buildingPreview.setPosition(positionAtWorld.x, positionAtWorld.y);
      this.buildingPreview.setDepth(depth);
      this.buildingPreview.setAlpha(this.isAllowBuild() ? 1.0 : 0.25);
    }
  }

  private destroyBuildingPreview() {
    this.buildingPreview.destroy();
    this.buildingPreview = null;
  }
}
