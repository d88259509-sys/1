/**
 * Physics & Collision Engine for Counter-Strike 1.6 Web3D.
 * Implements CS 1.6-style snappy movement, air strafing, step climbing,
 * hitbox zone resolution, and wall penetration raycasting.
 */

import * as THREE from 'three';

export interface HitResult {
  hit: boolean;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  hitboxZone?: 'head' | 'chest' | 'stomach' | 'legs';
  entityId?: string;
  isWallbang?: boolean;
}

export class CollisionSystem {
  private static playerRadius = 0.45;
  private static playerStandingHeight = 1.8;
  private static playerCrouchHeight = 1.2;
  private static stepHeight = 0.45;

  /**
   * Resolves player/bot capsule movement against all static world colliders.
   * Modifies position and velocity in-place.
   */
  public static moveEntity(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    dt: number,
    isCrouching: boolean,
    colliders: THREE.Box3[],
    isNoclip = false
  ): { isGrounded: boolean; fallDamage: number } {
    if (isNoclip) {
      position.addScaledVector(velocity, dt);
      return { isGrounded: false, fallDamage: 0 };
    }

    const height = isCrouching ? this.playerCrouchHeight : this.playerStandingHeight;
    const r = this.playerRadius;

    // Apply gravity
    const gravity = -20.0;
    velocity.y += gravity * dt;

    // Cap falling velocity
    velocity.y = Math.max(velocity.y, -30);

    // Save previous vertical speed to detect hard landing fall damage
    const prevVy = velocity.y;

    // Tentative target position
    const targetPos = position.clone().addScaledVector(velocity, dt);

    // Horizontal movement resolution with stair step-up
    const nextX = new THREE.Vector3(targetPos.x, position.y, position.y);
    const boxX = new THREE.Box3(
      new THREE.Vector3(targetPos.x - r, position.y, position.z - r),
      new THREE.Vector3(targetPos.x + r, position.y + height, position.z + r)
    );

    let hitX = false;
    for (const col of colliders) {
      if (boxX.intersectsBox(col)) {
        // Test step climbing
        const stepBox = new THREE.Box3(
          new THREE.Vector3(targetPos.x - r, position.y + this.stepHeight, position.z - r),
          new THREE.Vector3(targetPos.x + r, position.y + height + this.stepHeight, position.z + r)
        );
        if (!stepBox.intersectsBox(col) && velocity.y <= 0.1) {
          position.y += this.stepHeight * 0.5;
        } else {
          hitX = true;
          velocity.x = 0;
          break;
        }
      }
    }
    if (!hitX) {
      position.x = targetPos.x;
    }

    // Z resolution
    const boxZ = new THREE.Box3(
      new THREE.Vector3(position.x - r, position.y, targetPos.z - r),
      new THREE.Vector3(position.x + r, position.y + height, targetPos.z + r)
    );
    let hitZ = false;
    for (const col of colliders) {
      if (boxZ.intersectsBox(col)) {
        const stepBox = new THREE.Box3(
          new THREE.Vector3(position.x - r, position.y + this.stepHeight, targetPos.z - r),
          new THREE.Vector3(position.x + r, position.y + height + this.stepHeight, targetPos.z + r)
        );
        if (!stepBox.intersectsBox(col) && velocity.y <= 0.1) {
          position.y += this.stepHeight * 0.5;
        } else {
          hitZ = true;
          velocity.z = 0;
          break;
        }
      }
    }
    if (!hitZ) {
      position.z = targetPos.z;
    }

    // Vertical resolution (Y)
    position.y += velocity.y * dt;
    let isGrounded = false;
    let fallDamage = 0;

    const boxY = new THREE.Box3(
      new THREE.Vector3(position.x - r, position.y, position.z - r),
      new THREE.Vector3(position.x + r, position.y + height, position.z + r)
    );

    for (const col of colliders) {
      if (boxY.intersectsBox(col)) {
        if (velocity.y < 0) {
          // Landing on floor/box top
          position.y = col.max.y;
          isGrounded = true;

          // Calculate fall damage for impacts faster than -13 m/s
          if (prevVy < -13) {
            fallDamage = Math.min(100, Math.floor((Math.abs(prevVy) - 13) * 6));
          }
          velocity.y = 0;
        } else if (velocity.y > 0) {
          // Hitting ceiling
          position.y = col.min.y - height;
          velocity.y = 0;
        }
        break;
      }
    }

    // Ground clamp fallback
    if (position.y < 0) {
      position.y = 0;
      isGrounded = true;
      if (prevVy < -13) {
        fallDamage = Math.min(100, Math.floor((Math.abs(prevVy) - 13) * 6));
      }
      velocity.y = 0;
    }

    return { isGrounded, fallDamage };
  }

  /**
   * Raycast through the scene with wall penetration logic.
   */
  public static raycastBullet(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    penetrationPower: number, // 0 to 3
    worldColliders: THREE.Box3[],
    penetrableColliders: THREE.Box3[],
    targetEntities: { id: string; position: THREE.Vector3; isCrouching: boolean; isDead: boolean }[]
  ): HitResult[] {
    const ray = new THREE.Ray(origin, direction.clone().normalize());
    const results: HitResult[] = [];

    // Check hit against each enemy
    targetEntities.forEach((ent) => {
      if (ent.isDead) return;

      const entHeight = ent.isCrouching ? 1.2 : 1.8;
      const headCenter = new THREE.Vector3(ent.position.x, ent.position.y + entHeight - 0.18, ent.position.z);
      const chestCenter = new THREE.Vector3(ent.position.x, ent.position.y + entHeight * 0.6, ent.position.z);

      // Head sphere check (radius 0.22)
      const headSphere = new THREE.Sphere(headCenter, 0.22);
      const headIntersect = ray.intersectSphere(headSphere, new THREE.Vector3());
      if (headIntersect && origin.distanceTo(headIntersect) <= maxDistance) {
        results.push({
          hit: true,
          point: headIntersect,
          normal: headIntersect.clone().sub(headCenter).normalize(),
          distance: origin.distanceTo(headIntersect),
          hitboxZone: 'head',
          entityId: ent.id,
        });
        return;
      }

      // Body bounding box check
      const bodyBox = new THREE.Box3(
        new THREE.Vector3(ent.position.x - 0.35, ent.position.y, ent.position.z - 0.35),
        new THREE.Vector3(ent.position.x + 0.35, ent.position.y + entHeight - 0.25, ent.position.z + 0.35)
      );

      const bodyIntersect = ray.intersectBox(bodyBox, new THREE.Vector3());
      if (bodyIntersect && origin.distanceTo(bodyIntersect) <= maxDistance) {
        const hitY = bodyIntersect.y - ent.position.y;
        const zone = hitY < 0.7 ? 'legs' : hitY < 1.2 ? 'stomach' : 'chest';
        results.push({
          hit: true,
          point: bodyIntersect,
          normal: new THREE.Vector3(0, 0, 1),
          distance: origin.distanceTo(bodyIntersect),
          hitboxZone: zone,
          entityId: ent.id,
        });
      }
    });

    // Check world obstacles
    let nearestSolidDist = maxDistance;
    let solidHitPoint: THREE.Vector3 | null = null;
    let solidNormal = new THREE.Vector3(0, 1, 0);

    for (const col of worldColliders) {
      const isPenetrable = penetrableColliders.includes(col);
      const pt = ray.intersectBox(col, new THREE.Vector3());
      if (pt) {
        const d = origin.distanceTo(pt);
        if (d < nearestSolidDist) {
          if (!isPenetrable || penetrationPower === 0) {
            nearestSolidDist = d;
            solidHitPoint = pt;
          }
        }
      }
    }

    if (solidHitPoint) {
      results.push({
        hit: true,
        point: solidHitPoint,
        normal: solidNormal,
        distance: nearestSolidDist,
      });
    }

    // Sort by distance from shooter
    results.sort((a, b) => a.distance - b.distance);

    // Apply wall penetration flag if hit was after a thin penetrable obstacle
    let hasPassedPenetrable = false;
    for (const r of results) {
      if (r.entityId) {
        r.isWallbang = hasPassedPenetrable;
      }
      if (!r.entityId) {
        hasPassedPenetrable = true;
      }
    }

    return results;
  }
}
