/**
 * Counter-Strike 1.6 Web3D Types
 */

import * as THREE from 'three';

export type Team = 'CT' | 'T';

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'ROUND_END' | 'MATCH_END';

export type BotDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT';

export type Language = 'en' | 'uz' | 'ru';

export type WeaponSlot = 'PRIMARY' | 'SECONDARY' | 'KNIFE' | 'GRENADE' | 'C4';

export type WeaponId =
  // Knife
  | 'knife'
  // Pistols
  | 'glock18'
  | 'usp'
  | 'p228'
  | 'deagle'
  | 'fiveseven'
  | 'elites'
  // Shotguns
  | 'm3'
  | 'xm1014'
  // SMGs
  | 'mp5'
  | 'ump45'
  | 'p90'
  | 'mac10'
  | 'tmp'
  // Rifles
  | 'ak47'
  | 'm4a1'
  | 'famas'
  | 'galil'
  | 'sg552'
  | 'aug'
  // Snipers
  | 'scout'
  | 'awp'
  | 'g3sg1'
  | 'sg550'
  // Machinegun
  | 'm249'
  // Grenades
  | 'hegrenade'
  | 'flashbang'
  | 'smokegrenade'
  // Equipment
  | 'kevlar'
  | 'kevlar_helmet'
  | 'defuser'
  | 'nvg'
  // Special
  | 'c4';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  slot: WeaponSlot;
  team?: Team; // undefined means both teams can buy
  price: number;
  killReward: number;
  damage: number;
  fireRate: number; // rounds per minute
  magazineSize: number;
  maxReserveAmmo: number;
  reloadTime: number; // in seconds
  range: number;
  penetration: number; // 0 to 3 scale
  armorPenetration: number; // 0.0 to 1.0
  recoilVertical: number;
  recoilHorizontal: number;
  spreadBase: number;
  spreadMove: number;
  spreadJump: number;
  movementSpeed: number; // CS units (knife is 250, ak is 221, awp is 210)
  isAutomatic: boolean;
  hasSilencer?: boolean;
  hasBurst?: boolean;
  hasScope?: boolean;
  scopeZoomLevels?: number; // 1 or 2
  pellets?: number; // for shotguns
}

export interface PlayerInventory {
  primary?: WeaponId;
  primaryAmmo: number;
  primaryReserve: number;
  secondary: WeaponId;
  secondaryAmmo: number;
  secondaryReserve: number;
  knife: WeaponId;
  grenades: { [key in 'hegrenade' | 'flashbang' | 'smokegrenade']?: number };
  hasC4: boolean;
  hasDefuser: boolean;
  hasHelmet: boolean;
  hasNVG: boolean;
}

export interface EntityState {
  id: string;
  name: string;
  team: Team;
  isBot: boolean;
  isPlayer: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: { yaw: number; pitch: number };
  health: number;
  armor: number;
  isDead: boolean;
  isCrouching: boolean;
  isWalking: boolean;
  isGrounded: boolean;
  currentSlot: WeaponSlot;
  inventory: PlayerInventory;
  money: number;
  kills: number;
  deaths: number;
  ping: number;
  isPlanting: boolean;
  isDefusing: boolean;
  plantProgress: number; // 0 to 1
  defuseProgress: number; // 0 to 1
  flashDuration: number; // remaining seconds of blindness
}

export interface KillFeedItem {
  id: string;
  killerName: string;
  killerTeam: Team;
  victimName: string;
  victimTeam: Team;
  weapon: WeaponId;
  isHeadshot: boolean;
  isWallbang: boolean;
  timestamp: number;
}

export interface RadioMessage {
  id: string;
  senderName: string;
  senderTeam: Team;
  message: string;
  timestamp: number;
}

export interface BombSiteZone {
  name: 'A' | 'B';
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
}

export interface BuyZone {
  team: Team;
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface WaypointNode {
  id: number;
  pos: [number, number, number];
  tags: ('t_spawn' | 'ct_spawn' | 'site_a' | 'site_b' | 'banana' | 'mid' | 'apartments' | 'yard' | 'vents' | 'ramp' | 'bazaar' | 'cover')[];
  neighbors: number[];
}

export interface MapData {
  id: 'de_nuke' | 'de_inferno' | 'de_marokos';
  name: string;
  subtitle: string;
  spawnPointsCT: THREE.Vector3[];
  spawnPointsT: THREE.Vector3[];
  bombSites: BombSiteZone[];
  buyZones: BuyZone[];
  waypoints: WaypointNode[];
  skyColor: number;
  fogColor: number;
  groundTexture: string;
  wallTexture: string;
}

export interface ActiveBomb {
  position: THREE.Vector3;
  planterId: string;
  plantedAt: number; // timestamp
  site: 'A' | 'B';
  isDefused: boolean;
  isExploded: boolean;
}

export interface DroppedItem {
  id: string;
  weaponId: WeaponId;
  ammo: number;
  reserve: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  mesh?: THREE.Object3D;
}

export interface GrenadeEntity {
  id: string;
  type: 'hegrenade' | 'flashbang' | 'smokegrenade';
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ownerId: string;
  fuseTime: number; // seconds remaining
  bounces: number;
  mesh?: THREE.Object3D;
}

export interface SmokeCloud {
  id: string;
  position: THREE.Vector3;
  createdAt: number;
  duration: number;
  radius: number;
  particles: THREE.Mesh[];
}

export interface DecalInstance {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  type: 'bullet' | 'blood' | 'spray';
  color?: string;
  mesh?: THREE.Mesh;
}

export interface UserSettings {
  mouseSensitivity: number;
  masterVolume: number;
  fov: number;
  crosshairColor: string;
  crosshairSize: number;
  crosshairGap: number;
  language: Language;
}
