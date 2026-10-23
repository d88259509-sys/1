/**
 * Core GameEngine for Counter-Strike 1.6 Web3D.
 * Manages Three.js rendering, PointerLock controls, player kinematics,
 * recoil patterns, bullet pooling, grenades, C4 bomb logic, round flow,
 * bot synchronization, and cheat console commands.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sound } from '../audio/SoundSystem';
import { BotAI } from '../bots/BotAI';
import { BuiltMap, MapBuilder } from '../maps/MapBuilder';
import { MAPS } from '../maps/MapData';
import { CollisionSystem, HitResult } from '../physics/CollisionSystem';
import { canvasTextures } from '../textures/CanvasTextures';
import {
  ActiveBomb,
  BotDifficulty,
  DroppedItem,
  EntityState,
  GameState,
  GrenadeEntity,
  KillFeedItem,
  PlayerInventory,
  RadioMessage,
  SmokeCloud,
  Team,
  UserSettings,
  WeaponId,
  WeaponSlot,
} from '../types';
import { ViewModel } from '../weapons/ViewModel';
import { WEAPON_REGISTRY } from '../weapons/WeaponDefs';

export interface GameEngineCallbacks {
  onStateUpdate: (state: {
    health: number;
    armor: number;
    money: number;
    currentWeapon: WeaponId;
    ammo: number;
    reserve: number;
    roundTime: number;
    roundNumber: number;
    scoreCT: number;
    scoreT: number;
    team: Team;
    isPlanted: boolean;
    bombTimer: number;
    plantProgress: number;
    defuseProgress: number;
    hasDefuser: boolean;
    hasC4: boolean;
    canBuy: boolean;
    flashIntensity: number;
    crosshairSpread: number;
    isScoped: number;
    isDead: boolean;
    isSpectating: boolean;
    spectatorTargetName: string;
    hitmarker: boolean;
    isSilenced: boolean;
    isBurst: boolean;
  }) => void;
  onKillFeed: (item: KillFeedItem) => void;
  onRadioMessage: (msg: RadioMessage) => void;
  onRoundEnd: (winner: Team, reason: string) => void;
  onMatchEnd: (winner: Team) => void;
  onEntitiesUpdate: (entities: EntityState[]) => void;
  onConsoleLog: (text: string) => void;
}

export class GameEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public viewModel: ViewModel;

  // Map & World
  private currentMapId: string = 'de_nuke';
  private builtMap: BuiltMap | null = null;
  private mapGroup: THREE.Group = new THREE.Group();

  // Settings
  public settings: UserSettings = {
    mouseSensitivity: 1.8,
    masterVolume: 0.8,
    fov: 90,
    crosshairColor: '#00ff00',
    crosshairSize: 8,
    crosshairGap: 4,
    language: 'en',
  };

  // Game state
  public gameState: GameState = 'MENU';
  public playerTeam: Team = 'CT';
  public botDifficulty: BotDifficulty = 'NORMAL';
  public scoreCT: number = 0;
  public scoreT: number = 0;
  public roundNumber: number = 1;
  public consecutiveLossesCT: number = 0;
  public consecutiveLossesT: number = 0;

  // Round timers
  public freezeTimer: number = 5; // 5s freeze time
  public roundTimer: number = 115; // 1:55
  public buyTimeRemaining: number = 15; // 15s buy time

  // C4 Bomb
  public activeBomb: ActiveBomb | null = null;
  public bombTimer: number = 40; // 40s
  public bombMesh: THREE.Group | null = null;
  private bombBeepInterval: number = 1.0;
  private bombBeepTimer: number = 0;

  // Entities: Player + 9 Bots
  public player: EntityState;
  public bots: EntityState[] = [];
  private botMeshes: Map<string, THREE.Group> = new Map();

  // Dropped items & Grenades
  private droppedItems: DroppedItem[] = [];
  private activeGrenades: GrenadeEntity[] = [];
  private smokeClouds: SmokeCloud[] = [];

  // Spray decals
  private sprayCooldown: number = 0;
  private sprayDecals: THREE.Mesh[] = [];

  // Cheats
  public isGodMode: boolean = false;
  public isNoclip: boolean = false;
  public isInfiniteAmmo: boolean = false;
  public isWallhack: boolean = false;
  public speedMultiplier: number = 1.0;
  public gravityMultiplier: number = 1.0;

  // Controls & Input
  private keys: { [key: string]: boolean } = {};
  private isPointerLocked: boolean = false;
  private shootCooldown: number = 0;
  private lastWeaponSlot: WeaponSlot = 'SECONDARY';
  private scopeZoom: number = 0; // 0 = unscoped, 1 = zoom 1, 2 = zoom 2
  private isSilenced: boolean = false;
  private isBurstMode: boolean = false;
  private burstCount: number = 0;
  private hitmarkerTimer: number = 0;

  // Spectating when dead
  private spectateIndex: number = 0;

  // Flashlight
  private flashlight: THREE.SpotLight;
  private isFlashlightOn: boolean = false;

  private callbacks: GameEngineCallbacks;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private isSoftwareGl: boolean = false;

  constructor(canvasContainer: HTMLElement, callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    canvasContainer.appendChild(this.renderer.domElement);

    // Camera & Scene
    this.camera = new THREE.PerspectiveCamera(90, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.05, 300);
    this.scene = new THREE.Scene();

    // Environment reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.scene.add(this.mapGroup);

    // Procedural Viewmodel
    this.viewModel = new ViewModel();
    this.camera.add(this.viewModel.root);
    this.scene.add(this.camera);

    // Flashlight
    this.flashlight = new THREE.SpotLight(0xffffff, 0, 35, Math.PI / 6, 0.3, 1);
    this.camera.add(this.flashlight);
    this.flashlight.target = this.camera;

    // Create default player state
    this.player = this.createDefaultPlayer();

    // Setup input listeners
    this.setupInputs();

    // Window resize
    window.addEventListener('resize', this.onResize);

    // Initial map build
    this.loadMap('de_nuke');

    // Start simulation loop
    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private createDefaultPlayer(): EntityState {
    return {
      id: 'player',
      name: 'Player',
      team: this.playerTeam,
      isBot: false,
      isPlayer: true,
      position: new THREE.Vector3(0, 1.0, 0),
      velocity: new THREE.Vector3(),
      rotation: { yaw: 0, pitch: 0 },
      health: 100,
      armor: 0,
      isDead: false,
      isCrouching: false,
      isWalking: false,
      isGrounded: true,
      currentSlot: 'SECONDARY',
      inventory: {
        secondary: this.playerTeam === 'CT' ? 'usp' : 'glock18',
        secondaryAmmo: this.playerTeam === 'CT' ? 12 : 20,
        secondaryReserve: 100,
        knife: 'knife',
        primaryAmmo: 0,
        primaryReserve: 0,
        grenades: {},
        hasC4: false,
        hasDefuser: false,
        hasHelmet: false,
        hasNVG: false,
      },
      money: 800,
      kills: 0,
      deaths: 0,
      ping: 5,
      isPlanting: false,
      isDefusing: false,
      plantProgress: 0,
      defuseProgress: 0,
      flashDuration: 0,
    };
  }

  // --- Input & Pointer Lock Handling ---
  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyB') {
        // Handled in React BuyMenu overlay
      } else if (e.code === 'KeyQ') {
        this.switchLastWeapon();
      } else if (e.code === 'Digit1') {
        this.selectSlot('PRIMARY');
      } else if (e.code === 'Digit2') {
        this.selectSlot('SECONDARY');
      } else if (e.code === 'Digit3') {
        this.selectSlot('KNIFE');
      } else if (e.code === 'Digit4') {
        this.cycleGrenades();
      } else if (e.code === 'Digit5') {
        this.selectSlot('C4');
      } else if (e.code === 'KeyR') {
        this.reloadCurrentWeapon();
      } else if (e.code === 'KeyG') {
        this.dropCurrentWeapon();
      } else if (e.code === 'KeyF') {
        this.toggleFlashlight();
      } else if (e.code === 'KeyT') {
        this.sprayGraffiti();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (this.gameState !== 'PLAYING') return;
      if (e.button === 0) {
        this.keys['MouseLeft'] = true;
        this.handleWeaponFire(true);
      } else if (e.button === 2) {
        this.keys['MouseRight'] = true;
        this.handleAltFire();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.keys['MouseLeft'] = false;
      if (e.button === 2) this.keys['MouseRight'] = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked || this.gameState !== 'PLAYING') return;
      const sens = (this.settings.mouseSensitivity * 0.0022) / (this.scopeZoom === 2 ? 4 : this.scopeZoom === 1 ? 2 : 1);
      this.player.rotation.yaw -= e.movementX * sens;
      this.player.rotation.pitch -= e.movementY * sens;
      this.player.rotation.pitch = Math.max(-1.5, Math.min(1.5, this.player.rotation.pitch));
    });

    // Request pointer lock on canvas click
    this.renderer.domElement.addEventListener('click', () => {
      if (this.gameState === 'PLAYING' && !this.isPointerLocked) {
        this.renderer.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    });
  }

  public lockPointer() {
    this.renderer.domElement.requestPointerLock();
  }

  public unlockPointer() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public setSettings(newSettings: Partial<UserSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    sound.setVolume(this.settings.masterVolume);
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
  }

  // --- Map Loading & Switch ---
  public loadMap(mapId: 'de_nuke' | 'de_inferno' | 'de_marokos') {
    this.currentMapId = mapId;
    const mapDef = MAPS[mapId] || MAPS['de_nuke'];

    // Clear previous map objects
    while (this.mapGroup.children.length > 0) {
      this.mapGroup.remove(this.mapGroup.children[0]);
    }
    this.sprayDecals = [];

    // Build map
    this.builtMap = MapBuilder.build(mapDef);
    this.mapGroup.add(this.builtMap.group);

    this.scene.fog = new THREE.Fog(mapDef.fogColor, 40, 160);

    this.callbacks.onConsoleLog(`Loaded map: ${mapDef.name} (${mapDef.subtitle})`);
    this.startNewMatch();
  }

  // --- Match & Round Management ---
  public startNewMatch(team: Team = this.playerTeam) {
    this.playerTeam = team;
    this.scoreCT = 0;
    this.scoreT = 0;
    this.roundNumber = 1;
    this.consecutiveLossesCT = 0;
    this.consecutiveLossesT = 0;

    this.player = this.createDefaultPlayer();
    this.initBots();
    this.startRound();
  }

  private initBots() {
    // Clear old bot meshes
    this.botMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.botMeshes.clear();
    this.bots = [];

    const namesCT = ['Seal Team 6', 'SAS Bravo', 'GSG-9 Viper', 'GIGN Ghost', 'Urban CT'];
    const namesT = ['Phoenix Phoenix', 'Elite Guerilla', 'Arctic Rebel', 'Leet Krew', 'Anarchist'];

    // 5 CTs and 5 Ts (one entity is the player)
    const ctCount = this.playerTeam === 'CT' ? 4 : 5;
    const tCount = this.playerTeam === 'T' ? 4 : 5;

    for (let i = 0; i < ctCount; i++) {
      const b = this.createBot(`ct_bot_${i}`, namesCT[i], 'CT');
      this.bots.push(b);
      const mesh = BotAI.createBotMesh('CT');
      this.scene.add(mesh);
      this.botMeshes.set(b.id, mesh);
    }

    for (let i = 0; i < tCount; i++) {
      const b = this.createBot(`t_bot_${i}`, namesT[i], 'T');
      this.bots.push(b);
      const mesh = BotAI.createBotMesh('T');
      this.scene.add(mesh);
      this.botMeshes.set(b.id, mesh);
    }
  }

  private createBot(id: string, name: string, team: Team): EntityState {
    return {
      id,
      name,
      team,
      isBot: true,
      isPlayer: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      rotation: { yaw: 0, pitch: 0 },
      health: 100,
      armor: 0,
      isDead: false,
      isCrouching: false,
      isWalking: false,
      isGrounded: true,
      currentSlot: 'PRIMARY',
      inventory: {
        primary: team === 'T' ? 'ak47' : 'm4a1',
        primaryAmmo: 30,
        primaryReserve: 90,
        secondary: team === 'CT' ? 'usp' : 'glock18',
        secondaryAmmo: 12,
        secondaryReserve: 100,
        knife: 'knife',
        grenades: { hegrenade: 1, flashbang: 1 },
        hasC4: false,
        hasDefuser: team === 'CT',
        hasHelmet: true,
        hasNVG: false,
      },
      money: 800,
      kills: 0,
      deaths: 0,
      ping: Math.floor(Math.random() * 25 + 15),
      isPlanting: false,
      isDefusing: false,
      plantProgress: 0,
      defuseProgress: 0,
      flashDuration: 0,
    };
  }

  public startRound() {
    this.gameState = 'PLAYING';
    this.freezeTimer = 5;
    this.roundTimer = 115;
    this.buyTimeRemaining = 15;
    this.scopeZoom = 0;
    this.activeBomb = null;
    if (this.bombMesh) {
      this.scene.remove(this.bombMesh);
      this.bombMesh = null;
    }

    // Clear smoke & grenades
    this.smokeClouds.forEach((s) => s.particles.forEach((p) => this.scene.remove(p)));
    this.smokeClouds = [];
    this.activeGrenades.forEach((g) => g.mesh && this.scene.remove(g.mesh));
    this.activeGrenades = [];
    this.droppedItems.forEach((d) => d.mesh && this.scene.remove(d.mesh));
    this.droppedItems = [];

    const mapDef = MAPS[this.currentMapId] || MAPS['de_nuke'];

    // Spawn player
    const spawnPoints = this.playerTeam === 'CT' ? mapDef.spawnPointsCT : mapDef.spawnPointsT;
    const playerSpawn = spawnPoints[0];
    this.player.position.copy(playerSpawn);
    this.player.velocity.set(0, 0, 0);
    this.player.health = 100;
    this.player.isDead = false;
    this.player.flashDuration = 0;
    this.player.isPlanting = false;
    this.player.isDefusing = false;
    this.player.rotation.yaw = this.playerTeam === 'CT' ? Math.PI : 0;
    this.player.rotation.pitch = 0;

    // Reset player ammo mags to full from reserve
    this.replenishMagazines(this.player);

    // Spawn bots & assign C4
    const ctSpawns = [...mapDef.spawnPointsCT];
    const tSpawns = [...mapDef.spawnPointsT];
    let ctIdx = this.playerTeam === 'CT' ? 1 : 0;
    let tIdx = this.playerTeam === 'T' ? 1 : 0;

    let c4Assigned = false;

    // If player is Terrorist, 50% chance player starts with C4
    if (this.playerTeam === 'T' && Math.random() > 0.5) {
      this.player.inventory.hasC4 = true;
      c4Assigned = true;
    } else {
      this.player.inventory.hasC4 = false;
    }

    this.bots.forEach((b) => {
      b.health = 100;
      b.isDead = false;
      b.flashDuration = 0;
      b.isPlanting = false;
      b.isDefusing = false;
      b.velocity.set(0, 0, 0);

      if (b.team === 'CT') {
        b.position.copy(ctSpawns[ctIdx % ctSpawns.length]);
        ctIdx++;
      } else {
        b.position.copy(tSpawns[tIdx % tSpawns.length]);
        if (!c4Assigned) {
          b.inventory.hasC4 = true;
          c4Assigned = true;
        } else {
          b.inventory.hasC4 = false;
        }
        tIdx++;
      }

      // Bot buy weapons based on funds
      this.botBuyWeapons(b);
      this.replenishMagazines(b);

      const mesh = this.botMeshes.get(b.id);
      if (mesh) {
        mesh.visible = true;
        mesh.position.copy(b.position);
      }
    });

    this.updateCurrentWeaponView();
    sound.announce('Round start');
  }

  private replenishMagazines(ent: EntityState) {
    if (ent.inventory.primary) {
      const def = WEAPON_REGISTRY[ent.inventory.primary];
      ent.inventory.primaryAmmo = def.magazineSize;
    }
    const secDef = WEAPON_REGISTRY[ent.inventory.secondary];
    ent.inventory.secondaryAmmo = secDef.magazineSize;
  }

  private botBuyWeapons(bot: EntityState) {
    if (bot.money >= 3100) {
      bot.inventory.primary = bot.team === 'T' ? 'ak47' : 'm4a1';
      bot.inventory.primaryAmmo = 30;
      bot.inventory.primaryReserve = 90;
      bot.inventory.hasHelmet = true;
      bot.armor = 100;
      bot.money -= 3100;
    } else if (bot.money >= 1500) {
      bot.inventory.primary = 'mp5';
      bot.inventory.primaryAmmo = 30;
      bot.inventory.primaryReserve = 120;
      bot.armor = 50;
      bot.money -= 1500;
    }
  }

  // --- Weapon Slot & Switching ---
  public selectSlot(slot: WeaponSlot) {
    if (this.player.isDead) return;
    if (slot === 'PRIMARY' && !this.player.inventory.primary) return;
    if (slot === 'C4' && !this.player.inventory.hasC4) return;
    if (slot === 'GRENADE' && Object.keys(this.player.inventory.grenades).length === 0) return;

    if (this.player.currentSlot !== slot) {
      this.lastWeaponSlot = this.player.currentSlot;
      this.player.currentSlot = slot;
      this.scopeZoom = 0;
      this.updateCurrentWeaponView();
      sound.playKnifeSlash();
    }
  }

  public switchLastWeapon() {
    this.selectSlot(this.lastWeaponSlot);
  }

  private cycleGrenades() {
    const nades = Object.keys(this.player.inventory.grenades) as ('hegrenade' | 'flashbang' | 'smokegrenade')[];
    if (nades.length === 0) return;
    this.player.currentSlot = 'GRENADE';
    this.updateCurrentWeaponView();
  }

  public getCurrentWeaponId(): WeaponId {
    const inv = this.player.inventory;
    switch (this.player.currentSlot) {
      case 'PRIMARY': return inv.primary || 'knife';
      case 'SECONDARY': return inv.secondary;
      case 'KNIFE': return 'knife';
      case 'C4': return 'c4';
      case 'GRENADE': {
        const available = Object.keys(inv.grenades)[0] as WeaponId;
        return available || 'knife';
      }
    }
  }

  private updateCurrentWeaponView() {
    const wId = this.getCurrentWeaponId();
    this.viewModel.setWeapon(wId);
    this.viewModel.setSilencerVisible(this.isSilenced);
  }

  // --- Shooting & Alt Fire ---
  private handleWeaponFire(isFirstClick: boolean) {
    if (this.freezeTimer > 0 || this.player.isDead) return;
    const wId = this.getCurrentWeaponId();
    const def = WEAPON_REGISTRY[wId];

    if (!def.isAutomatic && !isFirstClick) return;
    if (this.shootCooldown > 0) return;

    if (wId === 'knife') {
      this.executeKnifeSlash();
      this.shootCooldown = 60 / def.fireRate;
      return;
    }

    if (wId === 'c4') {
      // Handled via E key
      return;
    }

    if (def.slot === 'GRENADE') {
      this.throwGrenade(wId as 'hegrenade' | 'flashbang' | 'smokegrenade');
      this.shootCooldown = 1.0;
      return;
    }

    // Check ammo
    const isPrimary = def.slot === 'PRIMARY';
    const currentAmmo = isPrimary ? this.player.inventory.primaryAmmo : this.player.inventory.secondaryAmmo;

    if (currentAmmo <= 0) {
      sound.playDryFire();
      this.shootCooldown = 0.3;
      return;
    }

    // Consume ammo (unless infinite_ammo cheat is active)
    if (!this.isInfiniteAmmo) {
      if (isPrimary) this.player.inventory.primaryAmmo--;
      else this.player.inventory.secondaryAmmo--;
    }

    this.shootCooldown = 60 / def.fireRate;
    this.executeBulletShot(this.player, def);

    // Glock 3-round burst mode handling
    if (wId === 'glock18' && this.isBurstMode) {
      setTimeout(() => this.executeBulletShot(this.player, def), 70);
      setTimeout(() => this.executeBulletShot(this.player, def), 140);
    }
  }

  private handleAltFire() {
    const wId = this.getCurrentWeaponId();
    const def = WEAPON_REGISTRY[wId];

    // AWP / Scout / SG552 / AUG Scope
    if (def.hasScope) {
      const maxLevels = def.scopeZoomLevels || 1;
      this.scopeZoom = (this.scopeZoom + 1) % (maxLevels + 1);
      sound.playClick(0, 1800, 0.4);
      return;
    }

    // Glock Burst toggle
    if (def.hasBurst) {
      this.isBurstMode = !this.isBurstMode;
      sound.playClick(0, 1400, 0.3);
      this.callbacks.onConsoleLog(`Glock fire mode: ${this.isBurstMode ? 'Burst-Fire' : 'Semi-Automatic'}`);
      return;
    }

    // M4A1 / USP Silencer toggle
    if (def.hasSilencer) {
      this.isSilenced = !this.isSilenced;
      this.viewModel.setSilencerVisible(this.isSilenced);
      sound.playReload(1.8);
      this.shootCooldown = 1.8;
      this.callbacks.onConsoleLog(`Silencer: ${this.isSilenced ? 'Attached' : 'Detached'}`);
      return;
    }

    // Knife secondary stab
    if (wId === 'knife') {
      this.executeKnifeStab();
      this.shootCooldown = 1.0;
    }
  }

  private executeKnifeSlash() {
    this.viewModel.triggerShoot(0.06);
    sound.playKnifeSlash();
    this.checkKnifeMelee(20);
  }

  private executeKnifeStab() {
    this.viewModel.triggerShoot(0.12);
    sound.playKnifeSlash();
    this.checkKnifeMelee(65);
  }

  private checkKnifeMelee(baseDamage: number) {
    const eye = this.camera.position.clone();
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);

    const enemies = this.bots.filter((b) => !b.isDead && b.team !== this.player.team);
    for (const b of enemies) {
      if (b.position.distanceTo(this.player.position) < 2.3) {
        // Check backstab angle
        const botFwd = new THREE.Vector3(Math.sin(b.rotation.yaw), 0, Math.cos(b.rotation.yaw));
        const dot = fwd.dot(botFwd);
        const dmg = dot > 0.6 ? baseDamage * 3 : baseDamage;

        this.damageEntity(b, dmg, 'knife', false, false, this.player);
        sound.playKnifeHit(true);
        this.hitmarkerTimer = 0.15;
        break;
      }
    }
  }

  private executeBulletShot(shooter: EntityState, def: typeof WEAPON_REGISTRY[WeaponId]) {
    this.viewModel.triggerShoot(def.recoilVertical);
    sound.playGunshot(def.id, this.isSilenced);

    // Calculate spread
    const speed = shooter.velocity.length();
    let spread = def.spreadBase;
    if (!shooter.isGrounded) spread += def.spreadJump;
    else if (speed > 1.0) spread += def.spreadMove;
    if (shooter.isCrouching) spread *= 0.6;
    if (this.scopeZoom > 0) spread *= 0.2;

    const spreadX = (Math.random() - 0.5) * spread;
    const spreadY = (Math.random() - 0.5) * spread;

    // Camera recoil kick
    if (shooter.isPlayer) {
      this.player.rotation.pitch += def.recoilVertical * 0.4;
      this.player.rotation.yaw += (Math.random() - 0.5) * def.recoilHorizontal;
    }

    const eye = new THREE.Vector3(shooter.position.x, shooter.position.y + (shooter.isCrouching ? 1.1 : 1.65), shooter.position.z);
    const fwd = new THREE.Vector3();
    if (shooter.isPlayer) {
      this.camera.getWorldDirection(fwd);
    } else {
      fwd.set(Math.sin(shooter.rotation.yaw), Math.sin(shooter.rotation.pitch), Math.cos(shooter.rotation.yaw));
    }
    fwd.x += spreadX;
    fwd.y += spreadY;
    fwd.normalize();

    const targets = (shooter.isPlayer ? this.bots : [this.player, ...this.bots.filter((b) => b.id !== shooter.id)]).map((e) => ({
      id: e.id,
      position: e.position,
      isCrouching: e.isCrouching,
      isDead: e.isDead,
    }));

    const hits = CollisionSystem.raycastBullet(
      eye,
      fwd,
      def.range,
      def.penetration,
      this.builtMap ? this.builtMap.colliders : [],
      this.builtMap ? this.builtMap.penetrableColliders : [],
      targets
    );

    if (hits.length > 0) {
      const firstHit = hits[0];
      if (firstHit.entityId) {
        const victim = targets.find((t) => t.id === firstHit.entityId);
        const victimEntity = (shooter.isPlayer ? this.bots : [this.player, ...this.bots]).find((e) => e.id === firstHit.entityId);
        if (victimEntity && victimEntity.team !== shooter.team) {
          const isHeadshot = firstHit.hitboxZone === 'head';
          let dmg = def.damage;
          if (isHeadshot) dmg *= 4;
          else if (firstHit.hitboxZone === 'legs') dmg *= 0.75;
          if (firstHit.isWallbang) dmg *= 0.55;

          this.damageEntity(victimEntity, dmg, def.id, isHeadshot, !!firstHit.isWallbang, shooter);

          if (shooter.isPlayer) {
            this.hitmarkerTimer = 0.15;
            sound.playHitmarker();
            if (isHeadshot) sound.playHeadshotDink();
          }
        }
      } else {
        // World impact decal & dust
        this.spawnBulletHole(firstHit.point, firstHit.normal);
      }
    }
  }

  private damageEntity(victim: EntityState, damage: number, weapon: WeaponId, isHeadshot: boolean, isWallbang: boolean, attacker: EntityState) {
    if (victim.isPlayer && this.isGodMode) return;

    // Armor absorption
    let effectiveDmg = damage;
    if (victim.armor > 0) {
      const def = WEAPON_REGISTRY[weapon];
      const absorbed = damage * (1 - def.armorPenetration) * 0.5;
      victim.armor = Math.max(0, victim.armor - absorbed);
      effectiveDmg -= absorbed;
    }

    victim.health = Math.max(0, victim.health - effectiveDmg);

    if (victim.health <= 0 && !victim.isDead) {
      victim.isDead = true;
      victim.deaths++;
      attacker.kills++;

      // Award money
      const reward = WEAPON_REGISTRY[weapon].killReward;
      attacker.money = Math.min(16000, attacker.money + reward);

      // Hide bot mesh if dead
      const mesh = this.botMeshes.get(victim.id);
      if (mesh) mesh.visible = false;

      // Drop weapon on death
      if (victim.inventory.primary) {
        this.spawnDroppedItem(victim.inventory.primary, victim.position);
      }
      if (victim.inventory.hasC4) {
        this.spawnDroppedItem('c4', victim.position);
        victim.inventory.hasC4 = false;
        sound.announce('Bomb has been dropped');
      }

      // Kill feed item
      const kf: KillFeedItem = {
        id: Math.random().toString(),
        killerName: attacker.name,
        killerTeam: attacker.team,
        victimName: victim.name,
        victimTeam: victim.team,
        weapon,
        isHeadshot,
        isWallbang,
        timestamp: Date.now(),
      };
      this.callbacks.onKillFeed(kf);

      // Check round end conditions
      this.checkRoundEnd();
    }
  }

  // --- Reloading & Dropping ---
  public reloadCurrentWeapon() {
    const wId = this.getCurrentWeaponId();
    const def = WEAPON_REGISTRY[wId];
    if (def.slot === 'KNIFE' || def.slot === 'C4' || def.slot === 'GRENADE') return;

    const isPrimary = def.slot === 'PRIMARY';
    const ammo = isPrimary ? this.player.inventory.primaryAmmo : this.player.inventory.secondaryAmmo;
    const reserve = isPrimary ? this.player.inventory.primaryReserve : this.player.inventory.secondaryReserve;

    if (ammo >= def.magazineSize || reserve <= 0) return;

    this.viewModel.triggerReload(def.reloadTime);
    sound.playReload(def.reloadTime);
    this.shootCooldown = def.reloadTime;

    setTimeout(() => {
      const needed = def.magazineSize - ammo;
      const transfer = Math.min(needed, reserve);
      if (isPrimary) {
        this.player.inventory.primaryAmmo += transfer;
        this.player.inventory.primaryReserve -= transfer;
      } else {
        this.player.inventory.secondaryAmmo += transfer;
        this.player.inventory.secondaryReserve -= transfer;
      }
    }, def.reloadTime * 1000);
  }

  public dropCurrentWeapon() {
    if (this.player.currentSlot === 'PRIMARY' && this.player.inventory.primary) {
      this.spawnDroppedItem(this.player.inventory.primary, this.player.position);
      this.player.inventory.primary = undefined;
      this.player.inventory.primaryAmmo = 0;
      this.selectSlot('SECONDARY');
    } else if (this.player.currentSlot === 'C4' && this.player.inventory.hasC4) {
      this.spawnDroppedItem('c4', this.player.position);
      this.player.inventory.hasC4 = false;
      this.selectSlot('SECONDARY');
      sound.announce('Bomb dropped');
    }
  }

  private spawnDroppedItem(weaponId: WeaponId, pos: THREE.Vector3) {
    const geom = new THREE.BoxGeometry(0.1, 0.15, 0.6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos.x, 0.1, pos.z);
    this.scene.add(mesh);

    this.droppedItems.push({
      id: Math.random().toString(),
      weaponId,
      ammo: WEAPON_REGISTRY[weaponId].magazineSize,
      reserve: WEAPON_REGISTRY[weaponId].maxReserveAmmo,
      position: mesh.position,
      rotation: mesh.rotation,
      mesh,
    });
  }

  // --- Grenades ---
  private throwGrenade(type: 'hegrenade' | 'flashbang' | 'smokegrenade') {
    const eye = this.camera.position.clone();
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);

    const vel = fwd.clone().multiplyScalar(18).add(new THREE.Vector3(0, 4, 0));

    const nadeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshStandardMaterial({ color: type === 'flashbang' ? 0xaaaaaa : 0x2e4222 })
    );
    nadeMesh.position.copy(eye);
    this.scene.add(nadeMesh);

    this.activeGrenades.push({
      id: Math.random().toString(),
      type,
      position: eye,
      velocity: vel,
      ownerId: this.player.id,
      fuseTime: 2.0,
      bounces: 0,
      mesh: nadeMesh,
    });

    // Remove from inventory
    delete this.player.inventory.grenades[type];
    this.selectSlot('KNIFE');
    sound.announce('Fire in the hole');
  }

  // --- Graffiti Spray (T key) ---
  private sprayGraffiti() {
    if (this.sprayCooldown > 0) return;
    const eye = this.camera.position.clone();
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);

    const hits = CollisionSystem.raycastBullet(
      eye,
      fwd,
      3.5,
      0,
      this.builtMap ? this.builtMap.colliders : [],
      [],
      []
    );

    if (hits.length > 0) {
      const hit = hits[0];
      const decalGeom = new THREE.PlaneGeometry(0.8, 0.8);
      const decalMat = new THREE.MeshBasicMaterial({
        map: canvasTextures.getSprayDecal(),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });

      const decal = new THREE.Mesh(decalGeom, decalMat);
      decal.position.copy(hit.point).addScaledVector(hit.normal, 0.02);
      decal.lookAt(hit.point.clone().add(hit.normal));
      this.scene.add(decal);
      this.sprayDecals.push(decal);

      sound.playSpray();
      this.sprayCooldown = 30; // 30s cooldown
    }
  }

  private spawnBulletHole(point: THREE.Vector3, normal: THREE.Vector3) {
    const geom = new THREE.PlaneGeometry(0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      map: canvasTextures.getBulletHole(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(point).addScaledVector(normal, 0.01);
    mesh.lookAt(point.clone().add(normal));
    this.scene.add(mesh);
  }

  private toggleFlashlight() {
    this.isFlashlightOn = !this.isFlashlightOn;
    this.flashlight.intensity = this.isFlashlightOn ? 2.5 : 0;
    sound.playFlashlight();
  }

  // --- C4 Bomb Plant & Defuse ---
  public tryPlantBomb(dt: number) {
    if (this.player.isDead || !this.player.inventory.hasC4 || this.activeBomb) return;
    if (!this.builtMap) return;

    // Check if player is standing on Bomb Site A or B
    const onSite = this.builtMap.bombSites.find((site) => {
      const p = this.player.position;
      return p.x >= site.min.x && p.x <= site.max.x && p.z >= site.min.z && p.z <= site.max.z;
    });

    if (onSite) {
      this.player.isPlanting = true;
      this.player.plantProgress += dt / 3.0; // 3s hold
      if (this.player.plantProgress >= 1.0) {
        this.plantC4(onSite.name, this.player.position.clone());
        this.player.inventory.hasC4 = false;
        this.player.isPlanting = false;
        this.player.plantProgress = 0;
        this.selectSlot('SECONDARY');
      }
    }
  }

  public tryDefuseBomb(dt: number) {
    if (this.player.isDead || this.player.team !== 'CT' || !this.activeBomb) return;
    const dist = this.player.position.distanceTo(this.activeBomb.position);
    if (dist < 2.5) {
      this.player.isDefusing = true;
      const defuseTime = this.player.inventory.hasDefuser ? 5.0 : 10.0;
      this.player.defuseProgress += dt / defuseTime;
      sound.playBombDefusing();

      if (this.player.defuseProgress >= 1.0) {
        this.defuseC4();
        this.player.isDefusing = false;
        this.player.defuseProgress = 0;
      }
    }
  }

  private plantC4(site: 'A' | 'B', pos: THREE.Vector3) {
    this.activeBomb = {
      position: pos,
      planterId: this.player.id,
      plantedAt: Date.now(),
      site,
      isDefused: false,
      isExploded: false,
    };
    this.bombTimer = 40;
    this.bombBeepInterval = 1.0;
    this.bombBeepTimer = 0;

    // Create 3D bomb mesh in world
    const c4Mesh = new THREE.Group();
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x5a4832 }));
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    led.position.set(0, 0.12, 0);
    c4Mesh.add(pack, led);
    c4Mesh.position.copy(pos);
    this.scene.add(c4Mesh);
    this.bombMesh = c4Mesh;

    sound.announce('The bomb has been planted');
  }

  private defuseC4() {
    if (!this.activeBomb) return;
    this.activeBomb.isDefused = true;
    sound.announce('Bomb has been defused');
    this.endRound('CT', 'Bomb Defused');
  }

  private explodeC4() {
    if (!this.activeBomb) return;
    this.activeBomb.isExploded = true;
    sound.playExplosion();
    sound.announce('Terrorists win');

    // Screen shake & damage players nearby
    const blastCenter = this.activeBomb.position;
    [this.player, ...this.bots].forEach((ent) => {
      const d = ent.position.distanceTo(blastCenter);
      if (d < 25) {
        const dmg = (1 - d / 25) * 350;
        ent.health = Math.max(0, ent.health - dmg);
        if (ent.health <= 0) ent.isDead = true;
      }
    });

    this.endRound('T', 'Target Destroyed');
  }

  // --- Round & Match Outcome ---
  private checkRoundEnd() {
    if (this.gameState !== 'PLAYING') return;

    const ctAlive = (this.player.team === 'CT' && !this.player.isDead) || this.bots.some((b) => b.team === 'CT' && !b.isDead);
    const tAlive = (this.player.team === 'T' && !this.player.isDead) || this.bots.some((b) => b.team === 'T' && !b.isDead);

    if (!tAlive && !this.activeBomb) {
      this.endRound('CT', 'Terrorists Eliminated');
    } else if (!ctAlive && (!this.activeBomb || this.activeBomb.isDefused)) {
      this.endRound('T', 'Counter-Terrorists Eliminated');
    }
  }

  private endRound(winner: Team, reason: string) {
    this.gameState = 'ROUND_END';

    if (winner === 'CT') {
      this.scoreCT++;
      this.consecutiveLossesT++;
      this.consecutiveLossesCT = 0;
      sound.announce('Counter-Terrorists win');
    } else {
      this.scoreT++;
      this.consecutiveLossesCT++;
      this.consecutiveLossesT = 0;
      sound.announce('Terrorists win');
    }

    // Economy payouts
    const winReward = 3250;
    const lossBonusCT = Math.min(3400, 1400 + this.consecutiveLossesCT * 500);
    const lossBonusT = Math.min(3400, 1400 + this.consecutiveLossesT * 500);

    if (this.player.team === winner) {
      this.player.money = Math.min(16000, this.player.money + winReward);
    } else {
      this.player.money = Math.min(16000, this.player.money + (this.player.team === 'CT' ? lossBonusCT : lossBonusT));
    }

    this.callbacks.onRoundEnd(winner, reason);

    // Half-time swap check (after round 15)
    if (this.roundNumber === 15) {
      this.callbacks.onConsoleLog('Halftime! Switching sides...');
      this.playerTeam = this.playerTeam === 'CT' ? 'T' : 'CT';
      this.player.team = this.playerTeam;
      this.scoreCT = 0;
      this.scoreT = 0;
    }

    // Match end check (first to 16 wins)
    if (this.scoreCT >= 16 || this.scoreT >= 16) {
      this.gameState = 'MATCH_END';
      this.callbacks.onMatchEnd(this.scoreCT >= 16 ? 'CT' : 'T');
      return;
    }

    // Next round after 4.5 seconds
    setTimeout(() => {
      this.roundNumber++;
      this.startRound();
    }, 4500);
  }

  // --- Buy System ---
  public buyItem(weaponId: WeaponId): boolean {
    if (this.buyTimeRemaining <= 0 && !this.isInfiniteAmmo) {
      this.callbacks.onConsoleLog('Buy time has expired!');
      return false;
    }

    const def = WEAPON_REGISTRY[weaponId];
    if (this.player.money < def.price && !this.isInfiniteAmmo) {
      this.callbacks.onConsoleLog('Insufficient funds!');
      return false;
    }

    if (!this.isInfiniteAmmo) {
      this.player.money -= def.price;
    }

    if (def.slot === 'PRIMARY') {
      this.player.inventory.primary = weaponId;
      this.player.inventory.primaryAmmo = def.magazineSize;
      this.player.inventory.primaryReserve = def.maxReserveAmmo;
      this.selectSlot('PRIMARY');
    } else if (def.slot === 'SECONDARY') {
      this.player.inventory.secondary = weaponId;
      this.player.inventory.secondaryAmmo = def.magazineSize;
      this.player.inventory.secondaryReserve = def.maxReserveAmmo;
      this.selectSlot('SECONDARY');
    } else if (def.slot === 'GRENADE') {
      this.player.inventory.grenades[weaponId as 'hegrenade' | 'flashbang' | 'smokegrenade'] = 1;
      this.selectSlot('GRENADE');
    } else if (weaponId === 'kevlar') {
      this.player.armor = 100;
    } else if (weaponId === 'kevlar_helmet') {
      this.player.armor = 100;
      this.player.inventory.hasHelmet = true;
    } else if (weaponId === 'defuser') {
      this.player.inventory.hasDefuser = true;
    }

    sound.playReload(1.0);
    return true;
  }

  // --- Cheat Console Execution ---
  public executeConsoleCommand(cmd: string) {
    const parts = cmd.trim().toLowerCase().split(' ');
    const op = parts[0];
    const arg = parts[1];

    switch (op) {
      case 'god':
        this.isGodMode = !this.isGodMode;
        this.callbacks.onConsoleLog(`God mode: ${this.isGodMode ? 'ON' : 'OFF'}`);
        break;
      case 'noclip':
        this.isNoclip = !this.isNoclip;
        this.callbacks.onConsoleLog(`Noclip: ${this.isNoclip ? 'ON' : 'OFF'}`);
        break;
      case 'money': {
        const val = parseInt(arg, 10) || 16000;
        this.player.money = Math.min(16000, val);
        this.callbacks.onConsoleLog(`Set money to $${this.player.money}`);
        break;
      }
      case 'give':
        if (arg && WEAPON_REGISTRY[arg as WeaponId]) {
          this.buyItem(arg as WeaponId);
          this.callbacks.onConsoleLog(`Gave weapon: ${arg}`);
        } else {
          this.callbacks.onConsoleLog(`Unknown weapon. Try: give ak47, give awp, give deagle, give m4a1`);
        }
        break;
      case 'infinite_ammo':
        this.isInfiniteAmmo = !this.isInfiniteAmmo;
        this.callbacks.onConsoleLog(`Infinite ammo: ${this.isInfiniteAmmo ? 'ON' : 'OFF'}`);
        break;
      case 'bot_add': {
        const b = this.createBot(`bot_${Date.now()}`, 'Reinforcement', this.playerTeam === 'CT' ? 'T' : 'CT');
        this.bots.push(b);
        const mesh = BotAI.createBotMesh(b.team);
        this.scene.add(mesh);
        this.botMeshes.set(b.id, mesh);
        this.callbacks.onConsoleLog(`Added 1 bot to team ${b.team}`);
        break;
      }
      case 'bot_kill':
        this.bots.forEach((b) => {
          if (!b.isDead) this.damageEntity(b, 500, 'knife', false, false, this.player);
        });
        this.callbacks.onConsoleLog('All bots eliminated.');
        break;
      case 'speed':
        this.speedMultiplier = parseFloat(arg) || 1.0;
        this.callbacks.onConsoleLog(`Speed set to ${this.speedMultiplier}x`);
        break;
      case 'gravity':
        this.gravityMultiplier = parseFloat(arg) || 1.0;
        this.callbacks.onConsoleLog(`Gravity set to ${this.gravityMultiplier}x`);
        break;
      case 'wallhack':
        this.isWallhack = !this.isWallhack;
        this.callbacks.onConsoleLog(`Wallhack (ESP): ${this.isWallhack ? 'ON' : 'OFF'}`);
        break;
      case 'restart':
        this.startRound();
        this.callbacks.onConsoleLog('Round restarted.');
        break;
      case 'map':
        if (arg === 'nuke' || arg === 'de_nuke') this.loadMap('de_nuke');
        else if (arg === 'inferno' || arg === 'de_inferno') this.loadMap('de_inferno');
        else if (arg === 'marokos' || arg === 'de_marokos') this.loadMap('de_marokos');
        else this.callbacks.onConsoleLog('Available maps: nuke, inferno, marokos');
        break;
      case 'help':
        this.callbacks.onConsoleLog('Commands: god, noclip, money <amt>, give <weapon>, infinite_ammo, bot_add, bot_kill, speed <val>, gravity <val>, wallhack, restart, map <nuke|inferno|marokos>');
        break;
      default:
        this.callbacks.onConsoleLog(`Unknown command: "${cmd}". Type 'help' for command list.`);
        break;
    }
  }

  // --- Main Simulation Loop ---
  private tick() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.gameState === 'PLAYING') {
      this.updatePhysics(dt);
      this.updateTimers(dt);
      this.updateBots(dt);
      this.updateGrenades(dt);
      this.updateC4(dt);
    }

    // Cooldown timers
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.sprayCooldown > 0) this.sprayCooldown -= dt;
    if (this.hitmarkerTimer > 0) this.hitmarkerTimer -= dt;
    if (this.player.flashDuration > 0) this.player.flashDuration = Math.max(0, this.player.flashDuration - dt);

    // Continuous full-auto fire
    if (this.keys['MouseLeft'] && this.shootCooldown <= 0) {
      this.handleWeaponFire(false);
    }

    // Notify React HUD
    this.sendHUDUpdate();

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private updateTimers(dt: number) {
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
    } else {
      if (this.buyTimeRemaining > 0) this.buyTimeRemaining -= dt;

      if (!this.activeBomb) {
        this.roundTimer -= dt;
        if (this.roundTimer <= 0) {
          // CT wins on timeout if bomb is not planted
          this.endRound('CT', 'Time Expired');
        }
      }
    }
  }

  private updatePhysics(dt: number) {
    if (this.player.isDead) {
      // Spectator mode: follow teammate
      const aliveTeammates = this.bots.filter((b) => b.team === this.player.team && !b.isDead);
      if (aliveTeammates.length > 0) {
        const target = aliveTeammates[this.spectateIndex % aliveTeammates.length];
        this.camera.position.lerp(new THREE.Vector3(target.position.x, target.position.y + 1.6, target.position.z), dt * 8);
        this.camera.rotation.set(0, target.rotation.yaw, 0);
      }
      return;
    }

    // Movement speeds in CS units (knife 250, ak 221, awp 210)
    const currentWeaponDef = WEAPON_REGISTRY[this.getCurrentWeaponId()];
    let baseSpeed = (currentWeaponDef.movementSpeed / 250) * 5.0 * this.speedMultiplier;

    const isCrouching = !!this.keys['ControlLeft'] || !!this.keys['ControlRight'];
    const isWalking = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];

    this.player.isCrouching = isCrouching;
    this.player.isWalking = isWalking;

    if (isCrouching) baseSpeed *= 0.35;
    else if (isWalking) baseSpeed *= 0.52;

    // Direction vectors
    const fwd = new THREE.Vector3(Math.sin(this.player.rotation.yaw), 0, Math.cos(this.player.rotation.yaw)).negate();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);

    let moveX = 0;
    let moveZ = 0;
    if (this.keys['KeyW']) { moveX += fwd.x; moveZ += fwd.z; }
    if (this.keys['KeyS']) { moveX -= fwd.x; moveZ -= fwd.z; }
    if (this.keys['KeyD']) { moveX += right.x; moveZ += right.z; }
    if (this.keys['KeyA']) { moveX -= right.x; moveZ -= right.z; }

    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 0.001) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }

    if (this.freezeTimer > 0) {
      moveX = 0;
      moveZ = 0;
    }

    // Ground acceleration vs Air strafing
    if (this.player.isGrounded) {
      this.player.velocity.x = THREE.MathUtils.damp(this.player.velocity.x, moveX * baseSpeed, 14, dt);
      this.player.velocity.z = THREE.MathUtils.damp(this.player.velocity.z, moveZ * baseSpeed, 14, dt);

      // Jump
      if (this.keys['Space'] && this.freezeTimer <= 0) {
        this.player.velocity.y = 5.8;
        this.player.isGrounded = false;
        sound.playFootstep('concrete');
      }
    } else {
      // CS 1.6 air strafe acceleration: slight speed gain when turning into strafe!
      const airAccel = 12.0;
      this.player.velocity.x += moveX * airAccel * dt;
      this.player.velocity.z += moveZ * airAccel * dt;
    }

    // Use key (E): Plant or Defuse
    if (this.keys['KeyE']) {
      if (this.player.team === 'T') this.tryPlantBomb(dt);
      else this.tryDefuseBomb(dt);
    } else {
      this.player.isPlanting = false;
      this.player.isDefusing = false;
      this.player.plantProgress = 0;
      this.player.defuseProgress = 0;
    }

    // Collision resolution
    const colliders = this.builtMap ? this.builtMap.colliders : [];
    const { isGrounded, fallDamage } = CollisionSystem.moveEntity(
      this.player.position,
      this.player.velocity,
      dt,
      this.player.isCrouching,
      colliders,
      this.isNoclip
    );

    this.player.isGrounded = isGrounded;

    if (fallDamage > 0) {
      this.damageEntity(this.player, fallDamage, 'knife', false, false, this.player);
      sound.playFootstep('concrete');
    }

    // Footstep audio: played every ~0.35s while running on ground, SILENT on Shift!
    const horizSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    if (this.player.isGrounded && horizSpeed > 1.2 && !isWalking) {
      if (Math.random() < dt * 3.2) {
        sound.playFootstep('concrete');
      }
    }

    // Camera positioning
    const eyeHeight = isCrouching ? 1.05 : 1.65;
    this.camera.position.set(this.player.position.x, this.player.position.y + eyeHeight, this.player.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.player.rotation.yaw;
    this.camera.rotation.x = this.player.rotation.pitch;

    // Viewmodel update
    this.viewModel.update(dt, horizSpeed > 0.8, horizSpeed * 40);

    // Dynamic FOV for snipers
    const targetFov = this.scopeZoom === 2 ? 15 : this.scopeZoom === 1 ? 40 : this.settings.fov;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 18, dt);
    this.camera.updateProjectionMatrix();
  }

  private updateBots(dt: number) {
    if (!this.builtMap) return;
    const mapDef = MAPS[this.currentMapId];

    BotAI.updateBots(
      this.bots,
      [this.player, ...this.bots],
      mapDef.waypoints,
      this.builtMap.colliders,
      this.smokeClouds,
      this.activeBomb,
      this.builtMap.bombSites,
      this.botDifficulty,
      dt,
      (sender, text) => {
        const msg: RadioMessage = {
          id: Math.random().toString(),
          senderName: sender.name,
          senderTeam: sender.team,
          message: text,
          timestamp: Date.now(),
        };
        this.callbacks.onRadioMessage(msg);
        sound.playRadioBeep();
      },
      (bot, targetPos) => {
        // Bot fire
        const wId = bot.inventory.primary || bot.inventory.secondary;
        const def = WEAPON_REGISTRY[wId];
        this.executeBulletShot(bot, def);
      },
      (bot, site) => {
        this.plantC4(site, bot.position.clone());
        bot.inventory.hasC4 = false;
      },
      (bot) => {
        this.defuseC4();
      }
    );

    // Synchronize bot meshes
    this.bots.forEach((b) => {
      const mesh = this.botMeshes.get(b.id);
      if (mesh) {
        mesh.visible = !b.isDead;
        mesh.position.copy(b.position);
        mesh.rotation.y = b.rotation.yaw;
      }
    });
  }

  private updateGrenades(dt: number) {
    for (let i = this.activeGrenades.length - 1; i >= 0; i--) {
      const g = this.activeGrenades[i];
      g.fuseTime -= dt;

      // Gravity & velocity
      g.velocity.y -= 18.0 * dt;
      g.position.addScaledVector(g.velocity, dt);

      // Floor bounce
      if (g.position.y <= 0.1) {
        g.position.y = 0.1;
        g.velocity.y *= -0.4;
        g.velocity.x *= 0.7;
        g.velocity.z *= 0.7;
        g.bounces++;
      }

      if (g.mesh) {
        g.mesh.position.copy(g.position);
      }

      // Detonation
      if (g.fuseTime <= 0) {
        if (g.mesh) this.scene.remove(g.mesh);
        this.activeGrenades.splice(i, 1);

        if (g.type === 'hegrenade') {
          sound.playExplosion(g.position.toArray(), this.player.position.toArray());
          // Area damage
          [this.player, ...this.bots].forEach((ent) => {
            const d = ent.position.distanceTo(g.position);
            if (d < 12) {
              const dmg = (1 - d / 12) * 98;
              this.damageEntity(ent, dmg, 'hegrenade', false, false, this.player);
            }
          });
        } else if (g.type === 'flashbang') {
          // Check line of sight and angle to player's camera
          const d = this.player.position.distanceTo(g.position);
          if (d < 30) {
            const fwd = new THREE.Vector3();
            this.camera.getWorldDirection(fwd);
            const toFlash = g.position.clone().sub(this.camera.position).normalize();
            const dot = fwd.dot(toFlash);
            if (dot > 0.2) {
              const intensity = (dot * (1 - d / 30));
              this.player.flashDuration = 5.0 * intensity;
              sound.playFlashbang(intensity);
            }
          }
          // Flash bots
          this.bots.forEach((b) => {
            if (b.position.distanceTo(g.position) < 25) {
              b.flashDuration = 4.0;
            }
          });
        } else if (g.type === 'smokegrenade') {
          sound.playSmokeDeploy();
          this.spawnSmokeCloud(g.position);
        }
      }
    }
  }

  private spawnSmokeCloud(pos: THREE.Vector3) {
    const particles: THREE.Mesh[] = [];
    const mat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    for (let i = 0; i < 18; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), mat);
      p.position.set(
        pos.x + (Math.random() - 0.5) * 4.5,
        pos.y + Math.random() * 2.5 + 0.5,
        pos.z + (Math.random() - 0.5) * 4.5
      );
      this.scene.add(p);
      particles.push(p);
    }

    this.smokeClouds.push({
      id: Math.random().toString(),
      position: pos,
      createdAt: Date.now(),
      duration: 25,
      radius: 4.5,
      particles,
    });
  }

  private updateC4(dt: number) {
    if (!this.activeBomb || this.activeBomb.isDefused || this.activeBomb.isExploded) return;

    this.bombTimer -= dt;
    this.bombBeepTimer += dt;

    // Pitch/frequency of beeps increases as timer approaches 0
    const urgency = 1 - Math.max(0, this.bombTimer) / 40;
    this.bombBeepInterval = Math.max(0.12, 1.0 - urgency * 0.85);

    if (this.bombBeepTimer >= this.bombBeepInterval) {
      this.bombBeepTimer = 0;
      sound.playBombBeep(urgency, this.activeBomb.position.toArray(), this.player.position.toArray());
    }

    if (this.bombTimer <= 0) {
      this.explodeC4();
    }
  }

  private sendHUDUpdate() {
    const wId = this.getCurrentWeaponId();
    const def = WEAPON_REGISTRY[wId];
    const isPrimary = def.slot === 'PRIMARY';
    const ammo = isPrimary ? this.player.inventory.primaryAmmo : this.player.inventory.secondaryAmmo;
    const reserve = isPrimary ? this.player.inventory.primaryReserve : this.player.inventory.secondaryReserve;

    this.callbacks.onStateUpdate({
      health: Math.ceil(this.player.health),
      armor: Math.ceil(this.player.armor),
      money: this.player.money,
      currentWeapon: wId,
      ammo,
      reserve,
      roundTime: Math.max(0, Math.ceil(this.freezeTimer > 0 ? this.freezeTimer : this.roundTimer)),
      roundNumber: this.roundNumber,
      scoreCT: this.scoreCT,
      scoreT: this.scoreT,
      team: this.playerTeam,
      isPlanted: !!this.activeBomb,
      bombTimer: Math.max(0, Math.ceil(this.bombTimer)),
      plantProgress: this.player.plantProgress,
      defuseProgress: this.player.defuseProgress,
      hasDefuser: this.player.inventory.hasDefuser,
      hasC4: this.player.inventory.hasC4,
      canBuy: this.buyTimeRemaining > 0,
      flashIntensity: Math.min(1.0, this.player.flashDuration / 4.0),
      crosshairSpread: (def.spreadBase + (this.player.velocity.length() > 0.5 ? 0.02 : 0)) * 500,
      isScoped: this.scopeZoom,
      isDead: this.player.isDead,
      isSpectating: this.player.isDead,
      spectatorTargetName: this.bots[this.spectateIndex]?.name || '',
      hitmarker: this.hitmarkerTimer > 0,
      isSilenced: this.isSilenced,
      isBurst: this.isBurstMode,
    });

    this.callbacks.onEntitiesUpdate([this.player, ...this.bots]);
  }

  private onResize = () => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    this.camera.aspect = parent.clientWidth / parent.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
  };

  public destroy() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
