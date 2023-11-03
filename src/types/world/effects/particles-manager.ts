import { IParticles, IParticlesParent } from '~type/world/effects/particles';
import { IBuilding } from '~type/world/entities/building';
import { INPC } from '~type/world/entities/npc';
import { IEnemy } from '~type/world/entities/npc/enemy';
import { IPlayer } from '~type/world/entities/player';
import { ISprite } from '~type/world/entities/sprite';

export interface IParticlesManager {
  createBloodEffect(parent: ISprite): Nullable<IParticles>
  createFireEffect(parent: IEnemy): Nullable<IParticles>
  createLongFireEffect(parent: IEnemy, params: { duration: number }): Nullable<IParticles>
  createLazerEffect(parent: IEnemy): Nullable<IParticles>
  createGlowEffect(parent: IParticlesParent, params: { speed: number; color: number }): Nullable<IParticles>
  createFrozeEffect(parent: INPC): Nullable<IParticles>
  createDustEffect(parent: IPlayer): Nullable<IParticles>
  createGenerationEffect(parent: IBuilding): Nullable<IParticles>
  createSpawnEffect(parent: IEnemy): Nullable<IParticles>
  createHealEffect(parent: ISprite, params: { duration: number }): Nullable<IParticles>
}