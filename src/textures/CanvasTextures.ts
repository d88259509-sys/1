/**
 * Procedural HTML5 Canvas Textures for Counter-Strike 1.6 Web3D.
 * Generates realistic maps, decals, crates, walls, and bomb site markers.
 */

import * as THREE from 'three';

class CanvasTextureFactory {
  private cache: Map<string, THREE.CanvasTexture> = new Map();

  private createTexture(key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    draw(ctx);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // --- Concrete Wall / Floor ---
  public getConcrete(colorHex = '#84878a', darkHex = '#5e6164'): THREE.CanvasTexture {
    return this.createTexture(`concrete_${colorHex}_${darkHex}`, 512, 512, (ctx) => {
      ctx.fillStyle = colorHex;
      ctx.fillRect(0, 0, 512, 512);

      // Noise speckles
      for (let i = 0; i < 25000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 2 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? darkHex : '#ffffff';
        ctx.globalAlpha = Math.random() * 0.12;
        ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1.0;

      // Subtle concrete panel lines
      ctx.strokeStyle = darkHex;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.35;
      ctx.strokeRect(0, 0, 512, 512);
      ctx.beginPath();
      ctx.moveTo(0, 256);
      ctx.lineTo(512, 256);
      ctx.moveTo(256, 0);
      ctx.lineTo(256, 512);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });
  }

  // --- Wooden Crate (Iconic CS 1.6 box) ---
  public getWoodCrate(): THREE.CanvasTexture {
    return this.createTexture('wood_crate', 512, 512, (ctx) => {
      // Base wood planks
      ctx.fillStyle = '#9c6634';
      ctx.fillRect(0, 0, 512, 512);

      // Horizontal planks
      const plankH = 512 / 6;
      for (let i = 0; i < 6; i++) {
        const y = i * plankH;
        ctx.fillStyle = i % 2 === 0 ? '#8a582b' : '#9c6634';
        ctx.fillRect(0, y, 512, plankH);

        // Wood grain streaks
        for (let j = 0; j < 30; j++) {
          ctx.fillStyle = '#613c19';
          ctx.globalAlpha = 0.15;
          ctx.fillRect(Math.random() * 512, y + Math.random() * plankH, Math.random() * 120 + 20, 2);
        }
        ctx.globalAlpha = 1.0;

        // Plank seam
        ctx.strokeStyle = '#38220c';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, y, 512, plankH);
      }

      // Wooden border braces
      ctx.fillStyle = '#7a4b22';
      ctx.fillRect(0, 0, 512, 40); // Top
      ctx.fillRect(0, 472, 512, 40); // Bottom
      ctx.fillRect(0, 0, 40, 512); // Left
      ctx.fillRect(472, 0, 40, 512); // Right

      // Diagonal cross brace
      ctx.beginPath();
      ctx.moveTo(40, 40);
      ctx.lineTo(80, 40);
      ctx.lineTo(472, 432);
      ctx.lineTo(472, 472);
      ctx.lineTo(432, 472);
      ctx.lineTo(40, 80);
      ctx.closePath();
      ctx.fillStyle = '#73461e';
      ctx.fill();

      // Metal corner brackets & bolts
      ctx.fillStyle = '#474747';
      const corners = [[0, 0], [452, 0], [0, 452], [452, 452]];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx, cy, 60, 60);
      });

      // Bolts
      ctx.fillStyle = '#b3b3b3';
      const bolts = [[20, 20], [492, 20], [20, 492], [492, 492], [256, 20], [256, 492], [20, 256], [492, 256]];
      bolts.forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Stenciled text "FRAGILE / DE_DUST"
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#2b1b0b';
      ctx.globalAlpha = 0.55;
      ctx.fillText('FRAGILE', 170, 230);
      ctx.font = '22px monospace';
      ctx.fillText('CS 1.6 CARGO', 165, 275);
      ctx.globalAlpha = 1.0;
    });
  }

  // --- Brick Wall (Inferno style) ---
  public getBrickWall(): THREE.CanvasTexture {
    return this.createTexture('brick_wall', 512, 512, (ctx) => {
      ctx.fillStyle = '#8f887c'; // Mortar
      ctx.fillRect(0, 0, 512, 512);

      const rows = 12;
      const rowH = 512 / rows;
      const brickW = 512 / 6;

      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (brickW / 2);
        for (let c = -1; c < 7; c++) {
          const x = c * brickW + offset + 2;
          const y = r * rowH + 2;
          const w = brickW - 4;
          const h = rowH - 4;

          const tone = Math.random() > 0.4 ? '#a6563d' : Math.random() > 0.5 ? '#bf684b' : '#87412b';
          ctx.fillStyle = tone;
          ctx.fillRect(x, y, w, h);

          // Texture noise on brick
          for (let k = 0; k < 40; k++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#572718' : '#e0876c';
            ctx.globalAlpha = 0.15;
            ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 3, 3);
          }
          ctx.globalAlpha = 1.0;
        }
      }
    });
  }

  // --- Sandstone Plaster (Moroccan / Dust style) ---
  public getSandstone(): THREE.CanvasTexture {
    return this.createTexture('sandstone', 512, 512, (ctx) => {
      ctx.fillStyle = '#d6b782';
      ctx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 30000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.6 ? '#ad8b55' : '#edd8ad';
        ctx.globalAlpha = Math.random() * 0.15;
        ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
      }
      ctx.globalAlpha = 1.0;

      // Plaster cracks
      ctx.strokeStyle = '#856434';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(100, 50);
      ctx.lineTo(140, 110);
      ctx.lineTo(135, 170);
      ctx.lineTo(190, 220);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });
  }

  // --- Yellow Industrial Corrugated Metal (Nuke style) ---
  public getIndustrialYellow(): THREE.CanvasTexture {
    return this.createTexture('industrial_yellow', 512, 512, (ctx) => {
      ctx.fillStyle = '#bf9324';
      ctx.fillRect(0, 0, 512, 512);

      const stripes = 16;
      const stripeW = 512 / stripes;
      for (let i = 0; i < stripes; i++) {
        const x = i * stripeW;
        const grad = ctx.createLinearGradient(x, 0, x + stripeW, 0);
        grad.addColorStop(0, '#9c7514');
        grad.addColorStop(0.5, '#e0b236');
        grad.addColorStop(1, '#85620b');
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, stripeW, 512);
      }

      // Rust drips
      ctx.fillStyle = '#422407';
      ctx.globalAlpha = 0.3;
      for (let j = 0; j < 12; j++) {
        const rx = Math.random() * 512;
        ctx.fillRect(rx, 0, Math.random() * 15 + 4, Math.random() * 160 + 20);
      }
      ctx.globalAlpha = 1.0;
    });
  }

  // --- Caution Hazard Stripes ---
  public getHazardStripes(): THREE.CanvasTexture {
    return this.createTexture('hazard_stripes', 256, 256, (ctx) => {
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = '#1c1b18';
      const stripeW = 40;
      for (let x = -256; x < 512; x += stripeW * 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + stripeW, 0);
        ctx.lineTo(x + stripeW + 256, 256);
        ctx.lineTo(x + 256, 256);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  // --- Bomb Site Marker Decal (A or B) ---
  public getBombSiteMarker(site: 'A' | 'B'): THREE.CanvasTexture {
    return this.createTexture(`bombsite_${site}`, 256, 256, (ctx) => {
      ctx.clearRect(0, 0, 256, 256);

      // Red spray ring
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(128, 128, 96, 0, Math.PI * 2);
      ctx.stroke();

      // Bold Red letter
      ctx.font = '900 130px sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(site, 128, 134);

      // Distressed spray dots around
      for (let i = 0; i < 400; i++) {
        const r = Math.random() * 115 + 10;
        const th = Math.random() * Math.PI * 2;
        ctx.fillStyle = '#dc2626';
        ctx.globalAlpha = Math.random() * 0.35;
        ctx.fillRect(128 + Math.cos(th) * r, 128 + Math.sin(th) * r, 2, 2);
      }
    });
  }

  // --- Player Graffiti Spray Decal ---
  public getSprayDecal(index = 0): THREE.CanvasTexture {
    return this.createTexture(`player_spray_${index}`, 256, 256, (ctx) => {
      ctx.clearRect(0, 0, 256, 256);

      // Skull & Crossbones or CS 1.6 target logo
      ctx.fillStyle = '#22c55e'; // Green CS spray
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 10;

      // Outer target crosshair
      ctx.beginPath();
      ctx.arc(128, 128, 80, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(128, 20);
      ctx.lineTo(128, 236);
      ctx.moveTo(20, 128);
      ctx.lineTo(236, 128);
      ctx.stroke();

      // Center skull silhouette
      ctx.beginPath();
      ctx.arc(128, 110, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(108, 120, 40, 30);

      // Eye holes
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(116, 110, 8, 0, Math.PI * 2);
      ctx.arc(140, 110, 8, 0, Math.PI * 2);
      ctx.fill();

      // Spray text
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'center';
      ctx.fillText('CS 1.6', 128, 200);

      // Spray paint specks
      for (let i = 0; i < 300; i++) {
        const r = Math.random() * 120;
        const th = Math.random() * Math.PI * 2;
        ctx.fillStyle = '#22c55e';
        ctx.globalAlpha = Math.random() * 0.4;
        ctx.fillRect(128 + Math.cos(th) * r, 128 + Math.sin(th) * r, 2, 2);
      }
    });
  }

  // --- Bullet Hole Decal ---
  public getBulletHole(): THREE.CanvasTexture {
    return this.createTexture('bullet_hole', 64, 64, (ctx) => {
      ctx.clearRect(0, 0, 64, 64);
      // Dark pit
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(32, 32, 10, 0, Math.PI * 2);
      ctx.fill();

      // Cracks radiating
      ctx.strokeStyle = '#2b2b2b';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(32 + Math.cos(ang) * 9, 32 + Math.sin(ang) * 9);
        ctx.lineTo(32 + Math.cos(ang) * 25, 32 + Math.sin(ang) * 25);
        ctx.stroke();
      }
    });
  }
}

export const canvasTextures = new CanvasTextureFactory();
