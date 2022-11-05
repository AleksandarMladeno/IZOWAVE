import Phaser from 'phaser';

import { AUDIO_VOLUME, CONTAINER_ID } from '~const/core';
import { DIFFICULTY_POWERS } from '~const/world/difficulty';
import { Analytics } from '~game/analytics';
import { Basic } from '~game/scenes/basic';
import { Menu } from '~game/scenes/menu';
import { Screen } from '~game/scenes/screen';
import { World } from '~game/scenes/world';
import { Tutorial } from '~game/tutorial';
import { shaders } from '~lib/shaders';
import { entries, keys } from '~lib/system';
import { GameDifficulty, GameEvents, GameStat } from '~type/game';

export class Game extends Phaser.Game {
  /**
   * Tutorial manager.
   */
  readonly tutorial: Tutorial;

  /**
   * Analytics manager.
   */
  readonly analytics: Analytics;

  /**
   * Game is started.
   */
  private _started: boolean = false;

  public get started() { return this._started; }

  private set started(v) { this._started = v; }

  /**
   * Game is finished.
   */
  private _finished: boolean = false;

  public get finished() { return this._finished; }

  private set finished(v) { this._finished = v; }

  /**
   * Game difficulty type.
   */
  private _difficultyType: GameDifficulty;

  public get difficultyType() { return this._difficultyType; }

  private set difficultyType(v) { this._difficultyType = v; }

  /**
   * Game difficulty multiply.
   */
  private _difficulty: number;

  public get difficulty() { return this._difficulty; }

  private set difficulty(v) { this._difficulty = v; }

  /**
   * Menu scene.
   */
  private _menu: Menu;

  public get menu() { return this._menu; }

  private set menu(v) { this._menu = v; }

  /**
   * Screen scene.
   */
  private _screen: Screen;

  public get screen() { return this._screen; }

  private set screen(v) { this._screen = v; }

  /**
   * World scene.
   */
  private _world: World;

  public get world() { return this._world; }

  private set world(v) { this._world = v; }

  /**
   * Game constructor.
   */
  constructor() {
    super({
      scene: [Basic, World, Screen, Menu],
      pixelArt: true,
      autoRound: true,
      disableContextMenu: true,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: CONTAINER_ID,
      backgroundColor: '#222',
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      physics: {
        default: 'arcade',
        arcade: {
          // debug: IS_DEV_MODE,
          fps: 60,
          gravity: { y: 0 },
        },
      },
    });

    this.tutorial = new Tutorial();
    this.analytics = new Analytics();

    this.readDifficulty();

    this.events.on(Phaser.Core.Events.READY, () => {
      this.screen = <Screen> this.scene.keys.SCREEN;
      this.menu = <Menu> this.scene.keys.MENU;
      this.world = <World> this.scene.keys.WORLD;

      this.sound.setVolume(AUDIO_VOLUME);

      this.registerShaders();
    });
  }

  /**
   * Pause game.
   */
  public pauseGame() {
    this.world.scene.pause();
    this.screen.scene.pause();

    this.scene.systemScene.scene.launch(this.menu, {
      pauseMode: true,
    });
  }

  /**
   * Resume game.
   */
  public resumeGame() {
    this.scene.systemScene.scene.stop(this.menu);

    this.world.scene.resume();
    this.screen.scene.resume();
  }

  /**
   * Start game.
   */
  public startGame() {
    this.finished = false;
    this.started = true;

    this.world.start();

    this.scene.systemScene.scene.stop(this.menu);
    this.scene.systemScene.scene.launch(this.screen);

    if (!IS_DEV_MODE) {
      window.onbeforeunload = function confirm() {
        return 'Leave game? No saves!';
      };
    }
  }

  /**
   * Stop game.
   */
  public stopGame() {
    this.started = false;

    this.scene.systemScene.scene.stop(this.menu);
    this.tutorial.disable();

    if (!IS_DEV_MODE) {
      delete window.onbeforeunload;
    }
  }

  /**
   * Restart game.
   */
  public restartGame() {
    this.stopGame();

    this.world.scene.restart({
      autoStart: true,
    });
  }

  /**
   * Finish game.
   */
  public finishGame() {
    this.stopGame();

    this.finished = true;

    const record = this.readBestStat();
    const stat = this.getCurrentStat();

    this.writeBestStat(stat, record);

    this.events.emit(GameEvents.GAMEOVER, stat, record);

    this.analytics.track({
      world: this.world,
      success: false,
    });
  }

  /**
   * Set game difficulty.
   *
   * @param type - Difficulty type
   */
  public setDifficulty(type: GameDifficulty) {
    localStorage.setItem('DIFFICULTY', type);

    this.difficultyType = type;
    this.difficulty = DIFFICULTY_POWERS[this.difficultyType];
  }

  /**
   * Set saved game difficulty.
   */
  private readDifficulty() {
    const difficultyType = <GameDifficulty> localStorage.getItem('DIFFICULTY') || GameDifficulty.NORMAL;

    this.setDifficulty(difficultyType);
  }

  /**
   * Get best game stat.
   */
  private readBestStat(): GameStat {
    const recordValue = localStorage.getItem(`BEST_STAT.${this.difficultyType}`);

    return recordValue ? JSON.parse(recordValue) : {};
  }

  /**
   * Save best game stat.
   */
  private writeBestStat(stat: GameStat, record: GameStat) {
    localStorage.setItem(`BEST_STAT.${this.difficultyType}`, JSON.stringify(
      keys(stat).reduce((curr, param) => ({
        ...curr,
        [param]: Math.max(stat[param], record[param] || 0),
      }), {}),
    ));
  }

  /**
   * Get current game stat.
   */
  private getCurrentStat(): GameStat {
    return {
      waves: this.world.wave.getCurrentNumber() - 1,
      kills: this.world.player.kills,
      level: this.world.player.level,
      lived: this.world.getTimerNow() / 1000 / 60,
    };
  }

  /**
   * Add shaders to renderer pipelines.
   */
  private registerShaders() {
    const renderer = <Phaser.Renderer.WebGL.WebGLRenderer> this.renderer;

    for (const [name, Shader] of entries(shaders)) {
      renderer.pipelines.addPostPipeline(name, Shader);
    }
  }
}
