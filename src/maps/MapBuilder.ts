/**
 * MapBuilder: Procedurally builds 3D map geometry, textures, lighting,
 * and extracts bounding boxes for the collision system.
 */

import * as THREE from 'three';
import { canvasTextures } from '../textures/CanvasTextures';
import { MapDefinition, MapObstacle } from './MapData';

export interface BuiltMap {
  group: THREE.Group;
  colliders: THREE.Box3[];
  penetrableColliders: THREE.Box3[];
  bombSites: { name: 'A' | 'B'; center: THREE.Vector3; min: THREE.Vector3; max: THREE.Vector3 }[];
  buyZones: { team: 'CT' | 'T'; min: THREE.Vector3; max: THREE.Vector3 }[];
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
}

export class MapBuilder {
  public static build(mapDef: MapDefinition): BuiltMap {
    const group = new THREE.Group();
    const colliders: THREE.Box3[] = [];
    const penetrableColliders: THREE.Box3[] = [];

    // Materials based on procedural canvas textures
    const concreteTex = canvasTextures.getConcrete();
    concreteTex.repeat.set(16, 16);
    const matConcrete = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.85,
      metalness: 0.1,
    });

    const woodTex = canvasTextures.getWoodCrate();
    const matWood = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.7,
      metalness: 0.05,
    });

    const brickTex = canvasTextures.getBrickWall();
    brickTex.repeat.set(4, 2);
    const matBrick = new THREE.MeshStandardMaterial({
      map: brickTex,
      roughness: 0.8,
      metalness: 0.05,
    });

    const sandTex = canvasTextures.getSandstone();
    sandTex.repeat.set(6, 6);
    const matSand = new THREE.MeshStandardMaterial({
      map: sandTex,
      roughness: 0.9,
      metalness: 0.05,
    });

    const yellowTex = canvasTextures.getIndustrialYellow();
    yellowTex.repeat.set(4, 2);
    const matYellow = new THREE.MeshStandardMaterial({
      map: yellowTex,
      roughness: 0.5,
      metalness: 0.3,
    });

    const hazardTex = canvasTextures.getHazardStripes();
    hazardTex.repeat.set(8, 1);
    const matHazard = new THREE.MeshStandardMaterial({
      map: hazardTex,
      roughness: 0.6,
      metalness: 0.1,
    });

    const matSiteA = new THREE.MeshBasicMaterial({
      map: canvasTextures.getBombSiteMarker('A'),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const matSiteB = new THREE.MeshBasicMaterial({
      map: canvasTextures.getBombSiteMarker('B'),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const getMat = (texName: MapObstacle['texture']) => {
      switch (texName) {
        case 'wood': return matWood;
        case 'brick': return matBrick;
        case 'sand': return matSand;
        case 'yellow': return matYellow;
        case 'hazard': return matHazard;
        case 'siteA': return matSiteA;
        case 'siteB': return matSiteB;
        default: return matConcrete;
      }
    };

    // Ground Plane (120x120)
    const groundGeom = new THREE.PlaneGeometry(130, 130);
    const groundMat = mapDef.groundTexture === 'sand' ? matSand : matConcrete;
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    // Floor collider
    colliders.push(new THREE.Box3(new THREE.Vector3(-65, -2, -65), new THREE.Vector3(65, 0, 65)));

    // Build obstacles
    mapDef.obstacles.forEach((obs) => {
      let mesh: THREE.Mesh;
      if (obs.type === 'cylinder') {
        const cylGeom = new THREE.CylinderGeometry(obs.size[0] / 2, obs.size[0] / 2, obs.size[2], 16);
        mesh = new THREE.Mesh(cylGeom, getMat(obs.texture));
        mesh.position.set(obs.pos[0], obs.pos[1], obs.pos[2]);
      } else if (obs.type === 'decal') {
        const decalGeom = new THREE.PlaneGeometry(obs.size[0], obs.size[2]);
        mesh = new THREE.Mesh(decalGeom, getMat(obs.texture));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(obs.pos[0], obs.pos[1], obs.pos[2]);
        group.add(mesh);
        return; // decals have no collision
      } else {
        const boxGeom = new THREE.BoxGeometry(obs.size[0], obs.size[1], obs.size[2]);
        mesh = new THREE.Mesh(boxGeom, getMat(obs.texture));
        mesh.position.set(obs.pos[0], obs.pos[1], obs.pos[2]);
      }

      if (obs.rot) {
        mesh.rotation.set(obs.rot[0], obs.rot[1], obs.rot[2]);
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Compute AABB for physics
      const box = new THREE.Box3().setFromObject(mesh);
      if (obs.penetrable) {
        penetrableColliders.push(box);
      }
      colliders.push(box);
    });

    // Lighting
    const hemiLight = new THREE.HemisphereLight(mapDef.skyColor, 0x444444, 0.9);
    hemiLight.position.set(0, 50, 0);
    group.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    sunLight.position.set(35, 60, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 140;
    const d = 55;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    group.add(sunLight);

    // Procedural Sky Dome
    const skyGeom = new THREE.SphereGeometry(180, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: mapDef.skyColor,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeom, skyMat);
    group.add(sky);

    return {
      group,
      colliders,
      penetrableColliders,
      bombSites: mapDef.bombSites,
      buyZones: mapDef.buyZones,
      sunLight,
      hemiLight,
    };
  }
}
