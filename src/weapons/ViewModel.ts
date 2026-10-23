/**
 * Procedural 3D First-Person Viewmodel (hands + weapon) in Three.js.
 * Includes recoil kick, reload animation, bobbing, muzzle flash, and shell ejection.
 */

import * as THREE from 'three';
import { WeaponId } from '../types';

export class ViewModel {
  public root: THREE.Group;
  public gunContainer: THREE.Group;
  public handsGroup: THREE.Group;
  public muzzleFlash: THREE.Mesh;
  public muzzleLight: THREE.PointLight;

  private currentWeapon: WeaponId = 'knife';
  private weaponMeshes: Map<WeaponId, THREE.Group> = new Map();

  // Animation states
  private bobTimer: number = 0;
  private recoilZ: number = 0;
  private recoilRotX: number = 0;
  private reloadProgress: number = -1; // -1 = not reloading
  private reloadDuration: number = 2.5;

  // Reusable materials
  private matGunMetal = new THREE.MeshStandardMaterial({ color: 0x1f2326, roughness: 0.35, metalness: 0.85 });
  private matGunDark = new THREE.MeshStandardMaterial({ color: 0x0f1113, roughness: 0.6, metalness: 0.4 });
  private matWood = new THREE.MeshStandardMaterial({ color: 0x7c451b, roughness: 0.7, metalness: 0.05 });
  private matSleeve = new THREE.MeshStandardMaterial({ color: 0x242e20, roughness: 0.85, metalness: 0.1 }); // Tactical green sleeve
  private matGlove = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.2 });
  private matSkin = new THREE.MeshStandardMaterial({ color: 0xcbb094, roughness: 0.65, metalness: 0.0 });
  private matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.95 });
  private matChrome = new THREE.MeshStandardMaterial({ color: 0xc0c8cf, roughness: 0.15, metalness: 0.95 });
  private matC4Plastic = new THREE.MeshStandardMaterial({ color: 0x705f4d, roughness: 0.8, metalness: 0.1 });
  private matOliveDrab = new THREE.MeshStandardMaterial({ color: 0x485834, roughness: 0.6, metalness: 0.3 });

  constructor() {
    this.root = new THREE.Group();
    this.gunContainer = new THREE.Group();
    this.handsGroup = new THREE.Group();

    this.root.add(this.gunContainer);
    this.gunContainer.add(this.handsGroup);

    // Initial position in camera space
    this.gunContainer.position.set(0.18, -0.18, -0.36);

    // Muzzle Flash
    const flashGeom = new THREE.PlaneGeometry(0.12, 0.12);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.muzzleFlash = new THREE.Mesh(flashGeom, flashMat);
    this.muzzleFlash.position.set(0, 0.06, -0.45);
    this.gunContainer.add(this.muzzleFlash);

    this.muzzleLight = new THREE.PointLight(0xffaa22, 0, 8);
    this.muzzleLight.position.set(0, 0.06, -0.45);
    this.gunContainer.add(this.muzzleLight);

    // Build procedural hands
    this.buildHands();

    // Build models for weapons
    this.buildAllWeapons();

    // Default to knife
    this.setWeapon('knife');
  }

  private buildHands() {
    // Right arm & sleeve
    const rightArmGeom = new THREE.CylinderGeometry(0.045, 0.05, 0.32, 8);
    const rightArm = new THREE.Mesh(rightArmGeom, this.matSleeve);
    rightArm.rotation.set(0.7, -0.2, -0.4);
    rightArm.position.set(0.08, -0.14, 0.08);
    this.handsGroup.add(rightArm);

    // Right glove
    const rightGloveGeom = new THREE.BoxGeometry(0.06, 0.06, 0.08);
    const rightGlove = new THREE.Mesh(rightGloveGeom, this.matGlove);
    rightGlove.position.set(0.02, -0.05, -0.02);
    this.handsGroup.add(rightGlove);

    // Left arm & sleeve
    const leftArmGeom = new THREE.CylinderGeometry(0.045, 0.05, 0.35, 8);
    const leftArm = new THREE.Mesh(leftArmGeom, this.matSleeve);
    leftArm.rotation.set(0.4, 0.5, 0.6);
    leftArm.position.set(-0.2, -0.16, 0.02);
    this.handsGroup.add(leftArm);

    // Left glove
    const leftGloveGeom = new THREE.BoxGeometry(0.055, 0.055, 0.075);
    const leftGlove = new THREE.Mesh(leftGloveGeom, this.matGlove);
    leftGlove.position.set(-0.1, -0.04, -0.18);
    this.handsGroup.add(leftGlove);
  }

  private buildAllWeapons() {
    // Knife
    const knifeGrp = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), this.matGunDark);
    handle.rotation.x = Math.PI / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.035, 0.18), this.matChrome);
    blade.position.set(0, 0.01, -0.14);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.01), this.matGunMetal);
    guard.position.set(0, 0, -0.06);
    knifeGrp.add(handle, blade, guard);
    this.weaponMeshes.set('knife', knifeGrp);

    // AK-47
    const akGrp = new THREE.Group();
    const akReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.32), this.matGunMetal);
    const akBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.32, 8), this.matGunMetal);
    akBarrel.rotation.x = Math.PI / 2;
    akBarrel.position.set(0, 0.015, -0.3);
    const akWoodHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.045, 0.16), this.matWood);
    akWoodHandguard.position.set(0, 0.01, -0.2);
    const akStock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.07, 0.22), this.matWood);
    akStock.position.set(0, -0.02, 0.24);
    // Curved banana magazine
    const akMag = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.14, 0.06), this.matGunDark);
    akMag.rotation.x = -0.3;
    akMag.position.set(0, -0.08, -0.04);
    const akGrip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.04), this.matWood);
    akGrip.rotation.x = -0.4;
    akGrip.position.set(0, -0.07, 0.09);
    akGrp.add(akReceiver, akBarrel, akWoodHandguard, akStock, akMag, akGrip);
    this.weaponMeshes.set('ak47', akGrp);

    // M4A1
    const m4Grp = new THREE.Group();
    const m4Receiver = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.065, 0.3), this.matGunDark);
    const m4Barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 8), this.matGunMetal);
    m4Barrel.rotation.x = Math.PI / 2;
    m4Barrel.position.set(0, 0.015, -0.28);
    const m4Silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8), this.matGunDark);
    m4Silencer.rotation.x = Math.PI / 2;
    m4Silencer.position.set(0, 0.015, -0.45);
    m4Silencer.name = 'silencer';
    const m4Mag = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.13, 0.05), this.matGunMetal);
    m4Mag.position.set(0, -0.08, -0.02);
    const m4Stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.2), this.matGunDark);
    m4Stock.position.set(0, -0.01, 0.22);
    const m4Handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.12), this.matGunDark);
    m4Handle.position.set(0, 0.055, 0.02);
    m4Grp.add(m4Receiver, m4Barrel, m4Silencer, m4Mag, m4Stock, m4Handle);
    this.weaponMeshes.set('m4a1', m4Grp);

    // AWP
    const awpGrp = new THREE.Group();
    const awpBody = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.52), this.matOliveDrab);
    const awpBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8), this.matGunMetal);
    awpBarrel.rotation.x = Math.PI / 2;
    awpBarrel.position.set(0, 0.02, -0.45);
    const awpMuzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), this.matGunDark);
    awpMuzzleBrake.position.set(0, 0.02, -0.68);
    // Telescopic Scope
    const awpScope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.24, 8), this.matGunDark);
    awpScope.rotation.x = Math.PI / 2;
    awpScope.position.set(0, 0.075, -0.08);
    awpGrp.add(awpBody, awpBarrel, awpMuzzleBrake, awpScope);
    this.weaponMeshes.set('awp', awpGrp);

    // Desert Eagle
    const deagleGrp = new THREE.Group();
    const deagleSlide = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.05, 0.22), this.matChrome);
    deagleSlide.position.set(0, 0.025, -0.05);
    const deagleGrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.11, 0.055), this.matGunDark);
    deagleGrip.rotation.x = -0.3;
    deagleGrip.position.set(0, -0.04, 0.02);
    deagleGrp.add(deagleSlide, deagleGrip);
    this.weaponMeshes.set('deagle', deagleGrp);

    // Glock-18
    const glockGrp = new THREE.Group();
    const glockSlide = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.04, 0.18), this.matGunDark);
    glockSlide.position.set(0, 0.02, -0.04);
    const glockGrip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.048), this.matGunDark);
    glockGrip.rotation.x = -0.28;
    glockGrip.position.set(0, -0.04, 0.01);
    glockGrp.add(glockSlide, glockGrip);
    this.weaponMeshes.set('glock18', glockGrp);

    // USP .45
    const uspGrp = new THREE.Group();
    const uspSlide = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.19), this.matGunMetal);
    uspSlide.position.set(0, 0.02, -0.04);
    const uspGrip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.1, 0.05), this.matGunDark);
    uspGrip.rotation.x = -0.26;
    uspGrip.position.set(0, -0.04, 0.01);
    const uspSilencer = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8), this.matGunDark);
    uspSilencer.rotation.x = Math.PI / 2;
    uspSilencer.position.set(0, 0.02, -0.21);
    uspSilencer.name = 'silencer';
    uspGrp.add(uspSlide, uspGrip, uspSilencer);
    this.weaponMeshes.set('usp', uspGrp);

    // MP5
    const mp5Grp = new THREE.Group();
    const mp5Body = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.06, 0.28), this.matGunDark);
    const mp5Barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 8), this.matGunMetal);
    mp5Barrel.rotation.x = Math.PI / 2;
    mp5Barrel.position.set(0, 0.01, -0.2);
    const mp5Mag = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.14, 0.04), this.matGunMetal);
    mp5Mag.rotation.x = -0.2;
    mp5Mag.position.set(0, -0.08, -0.04);
    mp5Grp.add(mp5Body, mp5Barrel, mp5Mag);
    this.weaponMeshes.set('mp5', mp5Grp);

    // C4 Bomb
    const c4Grp = new THREE.Group();
    const c4Pack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), this.matC4Plastic);
    const c4Tape = new THREE.Mesh(new THREE.BoxGeometry(0.124, 0.084, 0.04), this.matGunDark);
    const c4Keypad = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.01, 0.08), this.matGunMetal);
    c4Keypad.position.set(0, 0.045, -0.02);
    const c4Led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    c4Led.position.set(0.03, 0.05, 0.05);
    c4Grp.add(c4Pack, c4Tape, c4Keypad, c4Led);
    this.weaponMeshes.set('c4', c4Grp);

    // Grenade
    const grenadeGrp = new THREE.Group();
    const nadeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), this.matOliveDrab);
    const nadeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8), this.matGunMetal);
    nadeCap.position.set(0, 0.06, 0);
    grenadeGrp.add(nadeBody, nadeCap);
    this.weaponMeshes.set('hegrenade', grenadeGrp);
    this.weaponMeshes.set('flashbang', grenadeGrp.clone());
    this.weaponMeshes.set('smokegrenade', grenadeGrp.clone());

    // Map remaining weapon variants to closest generic rifle / smg / shotgun / sniper models
    this.weaponMeshes.set('galil', akGrp.clone());
    this.weaponMeshes.set('famas', m4Grp.clone());
    this.weaponMeshes.set('sg552', akGrp.clone());
    this.weaponMeshes.set('aug', m4Grp.clone());
    this.weaponMeshes.set('scout', awpGrp.clone());
    this.weaponMeshes.set('g3sg1', awpGrp.clone());
    this.weaponMeshes.set('sg550', awpGrp.clone());
    this.weaponMeshes.set('m249', akGrp.clone());
    this.weaponMeshes.set('ump45', mp5Grp.clone());
    this.weaponMeshes.set('p90', mp5Grp.clone());
    this.weaponMeshes.set('mac10', mp5Grp.clone());
    this.weaponMeshes.set('tmp', mp5Grp.clone());
    this.weaponMeshes.set('m3', mp5Grp.clone());
    this.weaponMeshes.set('xm1014', mp5Grp.clone());
    this.weaponMeshes.set('p228', glockGrp.clone());
    this.weaponMeshes.set('fiveseven', uspGrp.clone());
    this.weaponMeshes.set('elites', glockGrp.clone());

    // Add all to root (hidden by default)
    this.weaponMeshes.forEach((mesh) => {
      mesh.visible = false;
      this.gunContainer.add(mesh);
    });
  }

  public setWeapon(weaponId: WeaponId) {
    this.currentWeapon = weaponId;
    this.weaponMeshes.forEach((mesh, id) => {
      mesh.visible = id === weaponId;
    });

    // Reset offsets
    this.recoilZ = 0;
    this.recoilRotX = 0;
    this.reloadProgress = -1;

    // Adjust position depending on weapon size
    if (weaponId === 'knife') {
      this.gunContainer.position.set(0.14, -0.16, -0.3);
    } else if (weaponId === 'awp') {
      this.gunContainer.position.set(0.18, -0.2, -0.42);
    } else {
      this.gunContainer.position.set(0.18, -0.18, -0.36);
    }
  }

  public setSilencerVisible(visible: boolean) {
    const mesh = this.weaponMeshes.get(this.currentWeapon);
    if (!mesh) return;
    const silencer = mesh.getObjectByName('silencer');
    if (silencer) {
      silencer.visible = visible;
    }
  }

  public triggerShoot(recoilAmt: number = 0.04) {
    this.recoilZ = recoilAmt;
    this.recoilRotX = recoilAmt * 1.5;

    // Muzzle flash on firearms
    if (this.currentWeapon !== 'knife' && this.currentWeapon !== 'c4') {
      const flashMat = this.muzzleFlash.material as THREE.MeshBasicMaterial;
      flashMat.opacity = 1.0;
      this.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
      this.muzzleLight.intensity = 3.5;
    }
  }

  public triggerReload(duration: number) {
    this.reloadProgress = 0;
    this.reloadDuration = duration;
  }

  public update(dt: number, isMoving: boolean, moveSpeed: number) {
    // Dim muzzle flash quickly
    const flashMat = this.muzzleFlash.material as THREE.MeshBasicMaterial;
    if (flashMat.opacity > 0) {
      flashMat.opacity = Math.max(0, flashMat.opacity - dt * 25);
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 50);
    }

    // Recover recoil smoothly
    this.recoilZ = THREE.MathUtils.damp(this.recoilZ, 0, 16, dt);
    this.recoilRotX = THREE.MathUtils.damp(this.recoilRotX, 0, 16, dt);

    // Walking / breathing bobbing
    if (isMoving) {
      this.bobTimer += dt * 10 * (moveSpeed / 220);
    } else {
      this.bobTimer += dt * 1.5;
    }

    const bobX = Math.cos(this.bobTimer * 0.5) * (isMoving ? 0.008 : 0.0015);
    const bobY = Math.sin(this.bobTimer) * (isMoving ? 0.012 : 0.002);

    // Reload animation
    let reloadOffsetY = 0;
    let reloadRotX = 0;
    if (this.reloadProgress >= 0) {
      this.reloadProgress += dt / this.reloadDuration;
      if (this.reloadProgress >= 1.0) {
        this.reloadProgress = -1;
      } else {
        // Curve: dips down, tilts, comes back up
        const p = this.reloadProgress;
        reloadOffsetY = -Math.sin(p * Math.PI) * 0.12;
        reloadRotX = -Math.sin(p * Math.PI) * 0.35;
      }
    }

    // Apply combined transforms to weapon container
    const basePos = this.currentWeapon === 'knife' ? [0.14, -0.16, -0.3] : [0.18, -0.18, -0.36];
    this.gunContainer.position.x = basePos[0] + bobX;
    this.gunContainer.position.y = basePos[1] + bobY + reloadOffsetY;
    this.gunContainer.position.z = basePos[2] + this.recoilZ;

    this.gunContainer.rotation.x = this.recoilRotX + reloadRotX;
    this.gunContainer.rotation.y = -bobX * 2;
    this.gunContainer.rotation.z = bobX * 1.5;
  }
}
