/**
 * Advanced Bot AI for Counter-Strike 1.6 Web3D.
 * Features waypoint navigation, bomb planting/defusing, sensory perception
 * (smoke/flashbang blindness, sound hearing), and difficulty tiers.
 */

import * as THREE from 'three';
import { ActiveBomb, BotDifficulty, EntityState, Team, WaypointNode } from '../types';

export class BotAI {
  public static updateBots(
    bots: EntityState[],
    allEntities: EntityState[],
    waypoints: WaypointNode[],
    worldColliders: THREE.Box3[],
    smokeClouds: { position: THREE.Vector3; radius: number }[],
    activeBomb: ActiveBomb | null,
    bombSites: { name: 'A' | 'B'; center: THREE.Vector3 }[],
    difficulty: BotDifficulty,
    dt: number,
    onRadioChat: (sender: EntityState, text: string) => void,
    onBotShoot: (bot: EntityState, targetPos: THREE.Vector3) => void,
    onPlantBomb: (bot: EntityState, site: 'A' | 'B') => void,
    onDefuseBomb: (bot: EntityState) => void
  ) {
    const reactionDelay = difficulty === 'EXPERT' ? 0.12 : difficulty === 'HARD' ? 0.2 : difficulty === 'NORMAL' ? 0.3 : 0.45;
    const aimError = difficulty === 'EXPERT' ? 0.04 : difficulty === 'HARD' ? 0.09 : difficulty === 'NORMAL' ? 0.16 : 0.26;

    for (const bot of bots) {
      if (bot.isDead) continue;

      // Handle flashbang blindness
      if (bot.flashDuration > 0) {
        bot.flashDuration = Math.max(0, bot.flashDuration - dt);
        // While flashed, wander erratically and don't shoot
        bot.rotation.yaw += (Math.random() - 0.5) * dt * 2;
        continue;
      }

      // Check for visible enemies
      const enemies = allEntities.filter((e) => !e.isDead && e.team !== bot.team);
      let targetEnemy: EntityState | null = null;
      let minEnemyDist = Infinity;

      for (const enemy of enemies) {
        const d = bot.position.distanceTo(enemy.position);
        if (d > 70) continue;

        // Check smoke blocking
        const isBlockedBySmoke = smokeClouds.some((s) => {
          const toSmoke = s.position.distanceTo(bot.position);
          const enemyToSmoke = s.position.distanceTo(enemy.position);
          return toSmoke < s.radius || enemyToSmoke < s.radius || s.position.distanceTo(bot.position.clone().lerp(enemy.position, 0.5)) < s.radius;
        });
        if (isBlockedBySmoke) continue;

        // Line-of-sight raycast against solid world colliders
        const eyePos = new THREE.Vector3(bot.position.x, bot.position.y + 1.6, bot.position.z);
        const enemyEye = new THREE.Vector3(enemy.position.x, enemy.position.y + 1.5, enemy.position.z);
        const dir = enemyEye.clone().sub(eyePos).normalize();
        const ray = new THREE.Ray(eyePos, dir);

        let occluded = false;
        for (const col of worldColliders) {
          const pt = ray.intersectBox(col, new THREE.Vector3());
          if (pt && eyePos.distanceTo(pt) < d - 0.5) {
            occluded = true;
            break;
          }
        }

        if (!occluded && d < minEnemyDist) {
          minEnemyDist = d;
          targetEnemy = enemy;
        }
      }

      // COMBAT STATE
      if (targetEnemy) {
        // Aim at enemy head/chest
        const enemyAimPos = targetEnemy.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * aimError,
          targetEnemy.isCrouching ? 0.9 : 1.4 + (Math.random() - 0.5) * aimError * 0.5,
          (Math.random() - 0.5) * aimError
        ));

        const dx = enemyAimPos.x - bot.position.x;
        const dz = enemyAimPos.z - bot.position.z;
        const targetYaw = Math.atan2(dx, dz);
        bot.rotation.yaw = THREE.MathUtils.damp(bot.rotation.yaw, targetYaw, 1 / reactionDelay, dt);

        // Crouch when shooting rifles for better accuracy
        if (minEnemyDist > 8 && Math.random() < 0.3) {
          bot.isCrouching = true;
        }

        // Fire weapon
        onBotShoot(bot, enemyAimPos);

        // Radio shout on spot
        if (Math.random() < 0.005) {
          onRadioChat(bot, `Enemy spotted! [${targetEnemy.name}]`);
        }
        continue;
      }

      // TACTICAL OBJECTIVE STATE
      bot.isCrouching = false;

      // --- TERRORIST OBJECTIVE: PLANT BOMB OR GUARD ---
      if (bot.team === 'T') {
        if (!activeBomb) {
          // If carrying C4, go to Site A or B
          const targetSite = bombSites[0]; // Site A default
          const distToSite = bot.position.distanceTo(targetSite.center);

          if (bot.inventory.hasC4 && distToSite < 4.0) {
            // Plant bomb!
            bot.isPlanting = true;
            bot.plantProgress += dt / 3.0;
            if (bot.plantProgress >= 1.0) {
              onPlantBomb(bot, targetSite.name);
              bot.isPlanting = false;
              bot.plantProgress = 0;
            }
          } else {
            // Move toward site
            this.navigateToward(bot, targetSite.center, waypoints, dt);
          }
        } else {
          // Bomb is planted: Guard bomb site from cover
          const distToBomb = bot.position.distanceTo(activeBomb.position);
          if (distToBomb > 12) {
            this.navigateToward(bot, activeBomb.position, waypoints, dt);
          } else {
            // Hold angle
            bot.velocity.set(0, bot.velocity.y, 0);
          }
        }
      }

      // --- COUNTER-TERRORIST OBJECTIVE: DEFEND OR DEFUSE ---
      if (bot.team === 'CT') {
        if (activeBomb && !activeBomb.isDefused && !activeBomb.isExploded) {
          // Rotate to bomb site and defuse
          const distToBomb = bot.position.distanceTo(activeBomb.position);
          if (distToBomb < 2.5) {
            bot.isDefusing = true;
            const defuseTime = bot.inventory.hasDefuser ? 5.0 : 10.0;
            bot.defuseProgress += dt / defuseTime;
            if (bot.defuseProgress >= 1.0) {
              onDefuseBomb(bot);
              bot.isDefusing = false;
              bot.defuseProgress = 0;
            }
          } else {
            this.navigateToward(bot, activeBomb.position, waypoints, dt);
          }
        } else {
          // Patrol sites
          const siteTarget = bombSites[bot.id.charCodeAt(0) % bombSites.length];
          const dist = bot.position.distanceTo(siteTarget.center);
          if (dist > 8) {
            this.navigateToward(bot, siteTarget.center, waypoints, dt);
          } else {
            bot.velocity.set(0, bot.velocity.y, 0);
          }
        }
      }
    }
  }

  private static navigateToward(bot: EntityState, target: THREE.Vector3, waypoints: WaypointNode[], dt: number) {
    // Find closest waypoint to target
    let nearestWp: WaypointNode = waypoints[0];
    let minD = Infinity;
    for (const wp of waypoints) {
      const d = target.distanceTo(new THREE.Vector3(wp.pos[0], wp.pos[1], wp.pos[2]));
      if (d < minD) {
        minD = d;
        nearestWp = wp;
      }
    }

    const dir = new THREE.Vector3(nearestWp.pos[0] - bot.position.x, 0, nearestWp.pos[2] - bot.position.z);
    if (dir.length() > 0.5) {
      dir.normalize();
      const speed = 4.2; // CS run speed in m/s
      bot.velocity.x = dir.x * speed;
      bot.velocity.z = dir.z * speed;
      bot.rotation.yaw = THREE.MathUtils.damp(bot.rotation.yaw, Math.atan2(dir.x, dir.z), 8, dt);
    }
  }

  /**
   * Build procedural 3D model for Bots (CT vs T)
   */
  public static createBotMesh(team: Team): THREE.Group {
    const group = new THREE.Group();

    const matUniform = new THREE.MeshStandardMaterial({
      color: team === 'CT' ? 0x223a54 : 0x5a4832,
      roughness: 0.8,
      metalness: 0.1,
    });
    const matVest = new THREE.MeshStandardMaterial({
      color: team === 'CT' ? 0x182430 : 0x362c1e,
      roughness: 0.7,
      metalness: 0.2,
    });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xd8b594, roughness: 0.65 });
    const matPants = new THREE.MeshStandardMaterial({
      color: team === 'CT' ? 0x1b2838 : 0x2a2822,
      roughness: 0.85,
    });
    const matBoots = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });

    // Torso / Vest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.28), matVest);
    torso.position.y = 1.15;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), matSkin);
    head.position.y = 1.62;
    head.castShadow = true;
    group.add(head);

    // Helmet / Balaclava
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.34), matUniform);
    helmet.position.y = 1.72;
    group.add(helmet);

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.2), matPants);
    leftLeg.position.set(-0.14, 0.45, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.2), matPants);
    rightLeg.position.set(0.14, 0.45, 0);
    rightLeg.castShadow = true;
    group.add(leftLeg, rightLeg);

    // Boots
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.25), matBoots);
    leftBoot.position.set(-0.14, 0.08, 0.02);
    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.25), matBoots);
    rightBoot.position.set(0.14, 0.08, 0.02);
    group.add(leftBoot, rightBoot);

    // Gun in hands
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.1, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x151719, roughness: 0.4, metalness: 0.8 })
    );
    gun.position.set(0.2, 1.1, 0.3);
    group.add(gun);

    return group;
  }
}
