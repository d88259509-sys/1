/**
 * Detailed map specifications, callouts, bomb sites, and bot waypoints
 * for de_nuke, de_inferno, and de_marokos.
 */

import * as THREE from 'three';
import { MapData, WaypointNode } from '../types';

export interface MapObstacle {
  type: 'box' | 'ramp' | 'cylinder' | 'decal';
  pos: [number, number, number];
  size: [number, number, number];
  rot?: [number, number, number];
  texture: 'concrete' | 'brick' | 'wood' | 'sand' | 'yellow' | 'hazard' | 'siteA' | 'siteB';
  penetrable?: boolean;
}

export interface MapDefinition extends MapData {
  obstacles: MapObstacle[];
}

// -------------------------------------------------------------
// 1. DE_NUKE
// -------------------------------------------------------------
const nukeObstacles: MapObstacle[] = [
  // Outer perimeter boundary walls
  { type: 'box', pos: [0, 4, -45], size: [90, 8, 2], texture: 'concrete' }, // North wall
  { type: 'box', pos: [0, 4, 45], size: [90, 8, 2], texture: 'concrete' },  // South wall
  { type: 'box', pos: [-45, 4, 0], size: [2, 8, 90], texture: 'concrete' }, // West wall (Yard)
  { type: 'box', pos: [45, 4, 0], size: [2, 8, 90], texture: 'concrete' },  // East wall

  // Central Industrial Facility Structure (Site A Upper / Site B Lower)
  // Ground floor ceiling / Upper floor divider (Y = 0 is B site floor, Y = 5 is A site floor)
  // We'll place ground at Y = 0. Upper site A platform is at Y = 4.2
  { type: 'box', pos: [10, 2.1, 0], size: [34, 4.2, 38], texture: 'yellow' }, // Main building exterior
  { type: 'box', pos: [10, 4.3, 0], size: [32, 0.4, 36], texture: 'hazard' }, // Site A Floor Deck

  // Site A Interior: The Hut
  { type: 'box', pos: [4, 5.6, -6], size: [8, 2.4, 8], texture: 'yellow', penetrable: true },
  { type: 'box', pos: [4, 5.6, 6], size: [8, 2.4, 8], texture: 'wood', penetrable: true }, // Crates stack

  // Rafters / Catwalk in Site A
  { type: 'box', pos: [22, 6.5, 0], size: [4, 0.3, 28], texture: 'concrete' },
  // Heaven (ladder / sniper nest looking into A)
  { type: 'box', pos: [22, 5.5, 12], size: [6, 3.5, 6], texture: 'concrete' },

  // Ramp going up to Site A from T direction
  { type: 'ramp', pos: [-5, 2.1, 0], size: [10, 4.2, 8], rot: [0, 0, -0.4], texture: 'concrete' },

  // Outside Yard: The Silo
  { type: 'cylinder', pos: [-24, 4, -12], size: [5, 5, 8], texture: 'yellow' },
  // Garage / Secret entrance to B
  { type: 'box', pos: [-24, 2.5, 18], size: [12, 5, 10], texture: 'concrete' },
  // Yard shipping containers / cover
  { type: 'box', pos: [-15, 1.5, -2], size: [4, 3, 10], texture: 'yellow', penetrable: true },
  { type: 'box', pos: [-28, 1.5, 2], size: [4, 3, 8], texture: 'yellow' },

  // Site B lower floor obstacles & reactor core
  { type: 'cylinder', pos: [10, 2, 0], size: [4, 4, 4], texture: 'hazard' }, // Toxic core
  { type: 'box', pos: [16, 1, -8], size: [4, 2, 4], texture: 'wood', penetrable: true },
  { type: 'box', pos: [6, 1, 10], size: [4, 2, 4], texture: 'wood', penetrable: true },

  // Decal markers on ground
  { type: 'decal', pos: [10, 4.52, 0], size: [4, 0.05, 4], texture: 'siteA' },
  { type: 'decal', pos: [10, 0.02, 10], size: [4, 0.05, 4], texture: 'siteB' },
];

const nukeWaypoints: WaypointNode[] = [
  // T Spawn
  { id: 0, pos: [-38, 0, -35], tags: ['t_spawn'], neighbors: [1, 2] },
  { id: 1, pos: [-28, 0, -25], tags: ['yard'], neighbors: [0, 3, 4] },
  { id: 2, pos: [-18, 0, -32], tags: ['yard'], neighbors: [0, 3] },

  // Yard / Outside
  { id: 3, pos: [-20, 0, -10], tags: ['yard', 'cover'], neighbors: [1, 2, 5, 6] },
  { id: 4, pos: [-26, 0, 8], tags: ['yard'], neighbors: [1, 7] },

  // Path to Site A via Lobby & Ramp
  { id: 5, pos: [-4, 0, -10], tags: ['ramp'], neighbors: [3, 8] },
  { id: 8, pos: [6, 4.4, -6], tags: ['site_a', 'cover'], neighbors: [5, 9, 10] },
  { id: 9, pos: [10, 4.4, 0], tags: ['site_a'], neighbors: [8, 11] },
  { id: 10, pos: [16, 4.4, 8], tags: ['site_a', 'cover'], neighbors: [8, 12] },

  // Secret / Garage to Site B
  { id: 7, pos: [-18, 0, 18], tags: ['vents'], neighbors: [4, 13] },
  { id: 13, pos: [4, 0, 12], tags: ['site_b', 'cover'], neighbors: [7, 14] },
  { id: 14, pos: [10, 0, 0], tags: ['site_b'], neighbors: [13, 15] },
  { id: 15, pos: [16, 0, -8], tags: ['site_b', 'cover'], neighbors: [14, 12] },

  // CT Spawn & Heaven
  { id: 6, pos: [20, 4.4, -20], tags: ['ct_spawn'], neighbors: [11, 12] },
  { id: 11, pos: [22, 4.4, -4], tags: ['site_a', 'cover'], neighbors: [6, 9] },
  { id: 12, pos: [22, 0, 18], tags: ['ct_spawn'], neighbors: [6, 10, 15] },
];

export const MAP_NUKE: MapDefinition = {
  id: 'de_nuke',
  name: 'de_nuke',
  subtitle: 'Industrial Nuclear Facility (Upper A / Lower B)',
  skyColor: 0x93b7d8,
  fogColor: 0xa4c2de,
  groundTexture: 'concrete',
  wallTexture: 'yellow',
  spawnPointsT: [
    new THREE.Vector3(-38, 0.9, -35),
    new THREE.Vector3(-36, 0.9, -33),
    new THREE.Vector3(-40, 0.9, -36),
    new THREE.Vector3(-35, 0.9, -38),
    new THREE.Vector3(-38, 0.9, -32),
  ],
  spawnPointsCT: [
    new THREE.Vector3(22, 0.9, 20),
    new THREE.Vector3(24, 0.9, 18),
    new THREE.Vector3(20, 0.9, 22),
    new THREE.Vector3(26, 0.9, 21),
    new THREE.Vector3(21, 0.9, 25),
  ],
  bombSites: [
    {
      name: 'A',
      center: new THREE.Vector3(10, 4.4, 0),
      min: new THREE.Vector3(5, 4.0, -8),
      max: new THREE.Vector3(18, 6.0, 8),
    },
    {
      name: 'B',
      center: new THREE.Vector3(10, 0, 0),
      min: new THREE.Vector3(4, -0.5, -10),
      max: new THREE.Vector3(18, 2.5, 10),
    },
  ],
  buyZones: [
    { team: 'T', min: new THREE.Vector3(-45, 0, -45), max: new THREE.Vector3(-25, 4, -25) },
    { team: 'CT', min: new THREE.Vector3(15, 0, 10), max: new THREE.Vector3(35, 6, 30) },
  ],
  obstacles: nukeObstacles,
  waypoints: nukeWaypoints,
};

// -------------------------------------------------------------
// 2. DE_INFERNO
// -------------------------------------------------------------
const infernoObstacles: MapObstacle[] = [
  // Boundaries
  { type: 'box', pos: [0, 4, -45], size: [90, 8, 2], texture: 'brick' },
  { type: 'box', pos: [0, 4, 45], size: [90, 8, 2], texture: 'brick' },
  { type: 'box', pos: [-45, 4, 0], size: [2, 8, 90], texture: 'brick' },
  { type: 'box', pos: [45, 4, 0], size: [2, 8, 90], texture: 'brick' },

  // Banana alley (curved route on West side to B site)
  { type: 'box', pos: [-25, 3.5, -10], size: [12, 7, 30], texture: 'brick' }, // Banana inner building
  { type: 'box', pos: [-38, 3.5, 8], size: [8, 7, 24], texture: 'brick' },   // Banana outer wall
  // Banana sandbags & car cover
  { type: 'box', pos: [-28, 1, 2], size: [4, 2, 3], texture: 'wood', penetrable: true },
  { type: 'box', pos: [-32, 1, 14], size: [5, 2.2, 7], texture: 'concrete' }, // Coffin / car

  // Bomb Site B (Fountain / Church yard)
  { type: 'box', pos: [-22, 1.2, 32], size: [4, 2.4, 4], texture: 'wood', penetrable: true }, // B crates
  { type: 'cylinder', pos: [-26, 1.5, 30], size: [3, 3, 2], texture: 'concrete' }, // Fountain
  { type: 'box', pos: [-15, 4, 38], size: [14, 8, 10], texture: 'brick' }, // Church facade

  // Middle & Second Mid
  { type: 'box', pos: [0, 3.5, -15], size: [18, 7, 16], texture: 'brick' }, // Mid building
  { type: 'box', pos: [12, 3.5, 2], size: [12, 7, 20], texture: 'brick' },  // Boiler / Library

  // Bomb Site A (Pit, Balcony, Graveyard, Long)
  { type: 'box', pos: [28, 3.5, 24], size: [12, 7, 16], texture: 'brick' }, // Apartments / Balcony
  { type: 'box', pos: [34, 1, 12], size: [3, 2, 4], texture: 'wood', penetrable: true }, // Site A box stack
  { type: 'box', pos: [22, 1.2, 14], size: [4, 2.4, 4], texture: 'wood', penetrable: true }, // Pit cover
  { type: 'box', pos: [32, 3, -15], size: [10, 6, 20], texture: 'brick' }, // Graveyard wall

  // Ground Decals
  { type: 'decal', pos: [28, 0.02, 14], size: [4, 0.05, 4], texture: 'siteA' },
  { type: 'decal', pos: [-24, 0.02, 28], size: [4, 0.05, 4], texture: 'siteB' },
];

const infernoWaypoints: WaypointNode[] = [
  // T Spawn
  { id: 0, pos: [-10, 0, -36], tags: ['t_spawn'], neighbors: [1, 2] },
  // Towards Banana
  { id: 1, pos: [-24, 0, -30], tags: ['banana'], neighbors: [0, 3] },
  { id: 3, pos: [-30, 0, -12], tags: ['banana', 'cover'], neighbors: [1, 4] },
  { id: 4, pos: [-30, 0, 6], tags: ['banana', 'cover'], neighbors: [3, 5] },
  { id: 5, pos: [-26, 0, 24], tags: ['site_b', 'cover'], neighbors: [4, 6] },
  { id: 6, pos: [-24, 0, 32], tags: ['site_b'], neighbors: [5, 7] },

  // Towards Mid
  { id: 2, pos: [4, 0, -30], tags: ['mid'], neighbors: [0, 8] },
  { id: 8, pos: [6, 0, -10], tags: ['mid', 'cover'], neighbors: [2, 9, 10] },
  { id: 9, pos: [18, 0, 4], tags: ['apartments'], neighbors: [8, 11] },
  { id: 10, pos: [6, 0, 10], tags: ['mid'], neighbors: [8, 12] },

  // Site A
  { id: 11, pos: [26, 0, 14], tags: ['site_a', 'cover'], neighbors: [9, 13] },
  { id: 13, pos: [30, 0, 16], tags: ['site_a'], neighbors: [11, 7] },

  // CT Spawn
  { id: 7, pos: [2, 0, 34], tags: ['ct_spawn'], neighbors: [6, 12, 13] },
  { id: 12, pos: [12, 0, 22], tags: ['cover'], neighbors: [7, 10] },
];

export const MAP_INFERNO: MapDefinition = {
  id: 'de_inferno',
  name: 'de_inferno',
  subtitle: 'Mediterranean Village (Banana, Mid, Pit & Church)',
  skyColor: 0x86c2e8,
  fogColor: 0xbedcf2,
  groundTexture: 'concrete',
  wallTexture: 'brick',
  spawnPointsT: [
    new THREE.Vector3(-10, 0.9, -36),
    new THREE.Vector3(-8, 0.9, -38),
    new THREE.Vector3(-12, 0.9, -35),
    new THREE.Vector3(-6, 0.9, -37),
    new THREE.Vector3(-14, 0.9, -37),
  ],
  spawnPointsCT: [
    new THREE.Vector3(2, 0.9, 34),
    new THREE.Vector3(4, 0.9, 36),
    new THREE.Vector3(0, 0.9, 35),
    new THREE.Vector3(6, 0.9, 33),
    new THREE.Vector3(-2, 0.9, 34),
  ],
  bombSites: [
    {
      name: 'A',
      center: new THREE.Vector3(28, 0, 14),
      min: new THREE.Vector3(22, -0.5, 8),
      max: new THREE.Vector3(36, 3.5, 22),
    },
    {
      name: 'B',
      center: new THREE.Vector3(-24, 0, 28),
      min: new THREE.Vector3(-32, -0.5, 22),
      max: new THREE.Vector3(-16, 3.5, 36),
    },
  ],
  buyZones: [
    { team: 'T', min: new THREE.Vector3(-20, 0, -45), max: new THREE.Vector3(10, 4, -28) },
    { team: 'CT', min: new THREE.Vector3(-10, 0, 26), max: new THREE.Vector3(16, 4, 42) },
  ],
  obstacles: infernoObstacles,
  waypoints: infernoWaypoints,
};

// -------------------------------------------------------------
// 3. DE_MAROKOS
// -------------------------------------------------------------
const marokosObstacles: MapObstacle[] = [
  // Outer Sand Citadel Walls
  { type: 'box', pos: [0, 4.5, -45], size: [90, 9, 2], texture: 'sand' },
  { type: 'box', pos: [0, 4.5, 45], size: [90, 9, 2], texture: 'sand' },
  { type: 'box', pos: [-45, 4.5, 0], size: [2, 9, 90], texture: 'sand' },
  { type: 'box', pos: [45, 4.5, 0], size: [2, 9, 90], texture: 'sand' },

  // Central Bazaar / Market Courtyard
  { type: 'box', pos: [-16, 3.5, -12], size: [14, 7, 18], texture: 'sand' },
  { type: 'box', pos: [16, 3.5, -12], size: [14, 7, 18], texture: 'sand' },
  { type: 'box', pos: [0, 1.2, -4], size: [6, 2.4, 4], texture: 'wood', penetrable: true }, // Carpet market stall

  // Narrow arched bazaar alleys to Site A (East)
  { type: 'box', pos: [22, 3.5, 10], size: [16, 7, 12], texture: 'sand' },
  // Site A Fountain & Palm planter
  { type: 'cylinder', pos: [30, 1.2, 24], size: [4, 4, 2.4], texture: 'concrete' },
  { type: 'box', pos: [34, 1, 16], size: [3, 2, 4], texture: 'wood', penetrable: true },

  // Route to Site B (West courtyard & vault)
  { type: 'box', pos: [-22, 3.5, 12], size: [14, 7, 14], texture: 'sand' },
  { type: 'box', pos: [-32, 1.2, 22], size: [5, 2.4, 5], texture: 'wood', penetrable: true },
  { type: 'cylinder', pos: [-24, 3, 26], size: [1.2, 1.2, 6], texture: 'sand' }, // Architectural column

  // Rooftop sniper ramp / stairs
  { type: 'ramp', pos: [-8, 1.8, 16], size: [6, 3.6, 12], rot: [0.3, 0, 0], texture: 'sand' },
  { type: 'box', pos: [0, 3.4, 26], size: [14, 0.4, 8], texture: 'sand' }, // Flat rooftop overlook

  // Decals
  { type: 'decal', pos: [30, 0.02, 24], size: [4, 0.05, 4], texture: 'siteA' },
  { type: 'decal', pos: [-30, 0.02, 22], size: [4, 0.05, 4], texture: 'siteB' },
];

const marokosWaypoints: WaypointNode[] = [
  // T Spawn
  { id: 0, pos: [0, 0, -36], tags: ['t_spawn'], neighbors: [1, 2] },

  // West Alley to B
  { id: 1, pos: [-20, 0, -28], tags: ['bazaar'], neighbors: [0, 3] },
  { id: 3, pos: [-26, 0, -6], tags: ['bazaar', 'cover'], neighbors: [1, 4] },
  { id: 4, pos: [-30, 0, 14], tags: ['site_b', 'cover'], neighbors: [3, 5] },
  { id: 5, pos: [-28, 0, 24], tags: ['site_b'], neighbors: [4, 6] },

  // East Alley to A
  { id: 2, pos: [20, 0, -28], tags: ['bazaar'], neighbors: [0, 7] },
  { id: 7, pos: [24, 0, -6], tags: ['bazaar', 'cover'], neighbors: [2, 8] },
  { id: 8, pos: [28, 0, 12], tags: ['site_a', 'cover'], neighbors: [7, 9] },
  { id: 9, pos: [30, 0, 22], tags: ['site_a'], neighbors: [8, 6] },

  // CT Spawn & Rooftop connect
  { id: 6, pos: [0, 0, 34], tags: ['ct_spawn'], neighbors: [5, 9, 10] },
  { id: 10, pos: [0, 3.6, 24], tags: ['cover'], neighbors: [6] },
];

export const MAP_MAROKOS: MapDefinition = {
  id: 'de_marokos',
  name: 'de_marokos',
  subtitle: 'Moroccan Bazaar & Ancient Sandstone Citadel',
  skyColor: 0xd4c29a,
  fogColor: 0xe0d4b8,
  groundTexture: 'sand',
  wallTexture: 'sand',
  spawnPointsT: [
    new THREE.Vector3(0, 0.9, -36),
    new THREE.Vector3(-2, 0.9, -38),
    new THREE.Vector3(2, 0.9, -38),
    new THREE.Vector3(-4, 0.9, -35),
    new THREE.Vector3(4, 0.9, -35),
  ],
  spawnPointsCT: [
    new THREE.Vector3(0, 0.9, 34),
    new THREE.Vector3(-3, 0.9, 36),
    new THREE.Vector3(3, 0.9, 36),
    new THREE.Vector3(-5, 0.9, 33),
    new THREE.Vector3(5, 0.9, 33),
  ],
  bombSites: [
    {
      name: 'A',
      center: new THREE.Vector3(30, 0, 22),
      min: new THREE.Vector3(24, -0.5, 16),
      max: new THREE.Vector3(38, 3.5, 30),
    },
    {
      name: 'B',
      center: new THREE.Vector3(-28, 0, 24),
      min: new THREE.Vector3(-36, -0.5, 16),
      max: new THREE.Vector3(-20, 3.5, 32),
    },
  ],
  buyZones: [
    { team: 'T', min: new THREE.Vector3(-15, 0, -45), max: new THREE.Vector3(15, 4, -28) },
    { team: 'CT', min: new THREE.Vector3(-15, 0, 26), max: new THREE.Vector3(15, 4, 44) },
  ],
  obstacles: marokosObstacles,
  waypoints: marokosWaypoints,
};

export const MAPS: Record<string, MapDefinition> = {
  de_nuke: MAP_NUKE,
  de_inferno: MAP_INFERNO,
  de_marokos: MAP_MAROKOS,
};
