/**
 * CYBER SWARM: Nanite Protocol
 * High-Performance 3D Three.js Game Engine
 */

import * as THREE from 'three';
import { GameState, GatePair, BossData, UpgradesState } from '../types/game';
import { sound } from '../services/sound';

export interface GameCallbacks {
  onScoreUpdate: (unitCount: number) => void;
  onBossHpUpdate: (current: number, max: number) => void;
  onStateChange: (state: GameState) => void;
  onCoinEarned: (amount: number) => void;
  onFloatingText: (text: string, isPositive: boolean) => void;
}

interface NaniteUnit {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  targetOffset: THREE.Vector2; // lateral offset in swarm
  speed: number;
  alive: boolean;
  power: number;
  passedGates: Set<string>;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class CyberSwarmEngine {
  private container: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animId: number = 0;
  private isDestroyed: boolean = false;

  // Game state
  public state: GameState = 'MENU';
  public currentLevel: number = 1;
  public upgrades: UpgradesState = {
    fireRateLevel: 1,
    unitPowerLevel: 1,
    startingUnitsLevel: 1,
    coinMultiplierLevel: 1,
  };
  private callbacks: GameCallbacks;

  // Track & Arena Constants
  private readonly TRACK_WIDTH = 8.0;
  private readonly CANNON_Z = 12.0;
  private trackLength: number = 140;
  private bossZ: number = -120;

  // Player Cannon
  private cannonGroup!: THREE.Group;
  private barrelLeft!: THREE.Mesh;
  private barrelRight!: THREE.Mesh;
  private cannonTargetX: number = 0;
  private cannonCurrentX: number = 0;
  private cannonRecoil: number = 0;
  private fireTimer: number = 0;

  // Dynamic Entities
  private units: NaniteUnit[] = [];
  private gates: GatePair[] = [];
  private gateMeshes: THREE.Group[] = [];
  private bossData: BossData | null = null;
  private bossGroup: THREE.Group | null = null;
  private bossHpBarMesh: THREE.Mesh | null = null;
  private bossCoreMesh: THREE.Mesh | null = null;
  private bossShieldRings: THREE.Mesh[] = [];

  // Particles
  private particles: Particle[] = [];
  private particleGeom = new THREE.BufferGeometry();
  private sharedSparkMat!: THREE.MeshBasicMaterial;

  // Scenery & Environment
  private trackGrid!: THREE.Mesh;
  private gridMaterial!: THREE.ShaderMaterial;
  private sideBarriers!: THREE.Group;
  private ambientLight!: THREE.HemisphereLight;
  private dirLight!: THREE.DirectionalLight;

  // Reusable math scratchpads
  private readonly _vec3 = new THREE.Vector3();
  private readonly _clock = new THREE.Clock();

  // Screen shake
  private shakeIntensity: number = 0;

  // Touch / Drag state
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private cannonDragOriginX: number = 0;

  constructor(container: HTMLDivElement, callbacks: GameCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.initScene();
    this.setupLighting();
    this.createEnvironment();
    this.createPlayerCannon();
    this.setupEventListeners();
    this.animate();
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050712);
    this.scene.fog = new THREE.FogExp2(0x050712, 0.012);

    const width = this.container.clientWidth || 390;
    const height = this.container.clientHeight || 750;

    this.camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 300);
    // Dynamic cinematic 3rd-person camera placed behind and elevated above cannon
    this.camera.position.set(0, 8.5, 20.0);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.sharedSparkMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
  }

  private setupLighting() {
    // Cool cyan sky / warm magenta ground hemisphere light
    this.ambientLight = new THREE.HemisphereLight(0x00d8ff, 0x1a0933, 1.2);
    this.scene.add(this.ambientLight);

    // Dynamic directional key light
    this.dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.dirLight.position.set(10, 25, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 100;
    const d = 15;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Subtle neon cyan runner spotlight
    const spot = new THREE.SpotLight(0x00f3ff, 3, 40, Math.PI / 4, 0.4);
    spot.position.set(0, 12, 16);
    spot.target.position.set(0, 0, 0);
    this.scene.add(spot);
    this.scene.add(spot.target);
  }

  private createEnvironment() {
    // Futuristic glowing cyber grid highway
    const gridLength = 260;
    const geom = new THREE.PlaneGeometry(this.TRACK_WIDTH + 1.2, gridLength, 32, 200);
    geom.rotateX(-Math.PI / 2);

    // Custom glowing grid shader for moving sci-fi floor
    this.gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x050d24) },
        uColor2: { value: new THREE.Color(0x0b2559) },
        uLineColor: { value: new THREE.Color(0x00f3ff) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uLineColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          // Flowing grid lines
          float gridZ = fract((vWorldPos.z + uTime * 12.0) * 0.25);
          float lineZ = smoothstep(0.0, 0.05, gridZ) * (1.0 - smoothstep(0.05, 0.1, gridZ));
          
          float gridX = fract(vWorldPos.x * 0.5 + 0.5);
          float lineX = smoothstep(0.0, 0.04, gridX) * (1.0 - smoothstep(0.04, 0.08, gridX));
          
          float grid = max(lineZ, lineX);

          // Edge glow
          float edgeDist = abs(vWorldPos.x) / 4.0;
          float edgeGlow = pow(edgeDist, 3.0) * 0.8;

          vec3 baseColor = mix(uColor1, uColor2, vUv.y);
          vec3 finalColor = baseColor + (uLineColor * grid * 0.4) + (vec3(0.0, 0.9, 1.0) * edgeGlow);

          // Depth fog fading
          float dist = distance(vWorldPos, cameraPosition);
          float fog = clamp((dist - 30.0) / 120.0, 0.0, 1.0);
          finalColor = mix(finalColor, vec3(0.02, 0.03, 0.07), fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: true,
    });

    this.trackGrid = new THREE.Mesh(geom, this.gridMaterial);
    this.trackGrid.position.set(0, -0.05, -50);
    this.trackGrid.receiveShadow = true;
    this.scene.add(this.trackGrid);

    // Glowing energy side rails
    this.sideBarriers = new THREE.Group();
    const railGeom = new THREE.BoxGeometry(0.2, 0.4, gridLength);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00c8e6,
      emissiveIntensity: 1.5,
      metalness: 0.9,
      roughness: 0.1,
    });

    const leftRail = new THREE.Mesh(railGeom, railMat);
    leftRail.position.set(-this.TRACK_WIDTH / 2 - 0.1, 0.2, -50);
    const rightRail = new THREE.Mesh(railGeom, railMat);
    rightRail.position.set(this.TRACK_WIDTH / 2 + 0.1, 0.2, -50);

    this.sideBarriers.add(leftRail, rightRail);
    this.scene.add(this.sideBarriers);

    // Floating cyber background pillars/geometry
    this.createBackgroundSpireField();
  }

  private createBackgroundSpireField() {
    const spireGroup = new THREE.Group();
    const spireGeom = new THREE.BoxGeometry(1.5, 40, 1.5);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x0a1024,
      emissive: 0x002244,
      metalness: 0.8,
      roughness: 0.3,
    });

    for (let i = 0; i < 24; i++) {
      const spire = new THREE.Mesh(spireGeom, spireMat);
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (12 + (i % 4) * 5);
      const z = -140 + i * 15;
      const y = -10 + (i % 3) * 6;
      spire.position.set(x, y, z);
      spireGroup.add(spire);
    }
    this.scene.add(spireGroup);
  }

  /**
   * Composite 3D Sci-Fi Robot Cannon (7 distinct parts)
   */
  private createPlayerCannon() {
    this.cannonGroup = new THREE.Group();
    this.cannonGroup.position.set(0, 0, this.CANNON_Z);

    // Part 1: Heavy Armor Chassis Base
    const baseGeom = new THREE.BoxGeometry(1.6, 0.35, 1.2);
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      metalness: 0.9,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(baseGeom, darkMetalMat);
    base.position.y = 0.2;
    base.castShadow = true;
    this.cannonGroup.add(base);

    // Part 2: Dual Left & Right Mag-Lev Hover Pods
    const podGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.3, 12);
    podGeom.rotateX(Math.PI / 2);
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x1b243b,
      metalness: 0.85,
      roughness: 0.3,
    });
    const leftPod = new THREE.Mesh(podGeom, podMat);
    leftPod.position.set(-0.95, 0.2, 0);
    const rightPod = new THREE.Mesh(podGeom, podMat);
    rightPod.position.set(0.95, 0.2, 0);
    this.cannonGroup.add(leftPod, rightPod);

    // Part 3: Glowing Thruster Neon Ribbons
    const thrusterGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      blending: THREE.AdditiveBlending,
    });
    const glowRingGeom = new THREE.RingGeometry(0.12, 0.22, 16);
    const leftGlow = new THREE.Mesh(glowRingGeom, thrusterGlowMat);
    leftGlow.position.set(-0.95, 0.2, 0.66);
    const rightGlow = new THREE.Mesh(glowRingGeom, thrusterGlowMat);
    rightGlow.position.set(0.95, 0.2, 0.66);
    this.cannonGroup.add(leftGlow, rightGlow);

    // Part 4: Center Core Reactor (Pulsating Blue Sphere)
    const reactorGeom = new THREE.SphereGeometry(0.26, 16, 16);
    const reactorMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00e1ff,
      emissiveIntensity: 2.5,
      roughness: 0.1,
    });
    const reactor = new THREE.Mesh(reactorGeom, reactorMat);
    reactor.position.set(0, 0.45, 0.1);
    this.cannonGroup.add(reactor);

    // Part 5 & 6: Dual Plasma Rail Barrels (Recoil animated)
    const barrelGeom = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 12);
    barrelGeom.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x222b3e,
      metalness: 0.95,
      roughness: 0.15,
    });

    this.barrelLeft = new THREE.Mesh(barrelGeom, barrelMat);
    this.barrelLeft.position.set(-0.35, 0.45, -0.6);
    this.barrelLeft.castShadow = true;

    this.barrelRight = new THREE.Mesh(barrelGeom, barrelMat);
    this.barrelRight.position.set(0.35, 0.45, -0.6);
    this.barrelRight.castShadow = true;

    this.cannonGroup.add(this.barrelLeft, this.barrelRight);

    // Part 7: Plasma Muzzle Emitters
    const muzzleGeom = new THREE.TorusGeometry(0.11, 0.03, 8, 16);
    const muzzleLeft = new THREE.Mesh(muzzleGeom, thrusterGlowMat);
    muzzleLeft.position.set(-0.35, 0.45, -1.2);
    const muzzleRight = new THREE.Mesh(muzzleGeom, thrusterGlowMat);
    muzzleRight.position.set(0.35, 0.45, -1.2);
    this.cannonGroup.add(muzzleLeft, muzzleRight);

    // Targeting Laser Line
    const laserMat = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.35,
    });
    const laserGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.45, -1.2),
      new THREE.Vector3(0, 0.45, -25.0),
    ]);
    const laserLine = new THREE.Line(laserGeom, laserMat);
    this.cannonGroup.add(laserLine);

    // Ground contact shadow
    const shadowGeom = new THREE.PlaneGeometry(2.4, 1.8);
    shadowGeom.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
    });
    const contactShadow = new THREE.Mesh(shadowGeom, shadowMat);
    contactShadow.position.y = 0.01;
    this.cannonGroup.add(contactShadow);

    this.scene.add(this.cannonGroup);
  }

  /**
   * Set up Level Gates and Boss based on level number
   */
  public loadLevel(levelNum: number) {
    this.currentLevel = levelNum;

    // Clear existing entities
    this.clearLevelEntities();

    // Scale level distance & boss stats
    const gateCount = 2 + Math.min(levelNum, 4);
    const spacing = 28;
    this.trackLength = 40 + gateCount * spacing;
    this.bossZ = -this.trackLength;

    // Generate Gates
    this.gates = [];
    const gateOperations: Array<{ op: 'multiply' | 'add' | 'subtract'; valRange: [number, number] }> = [
      { op: 'multiply', valRange: [2, 3] },
      { op: 'add', valRange: [5, 12 + levelNum * 3] },
      { op: 'multiply', valRange: [2, 4] },
      { op: 'subtract', valRange: [3, 8 + levelNum * 2] },
      { op: 'add', valRange: [10, 25] },
    ];

    for (let i = 0; i < gateCount; i++) {
      const zPos = -30 - i * spacing;

      // Positive gate
      const posOp = Math.random() > 0.4 ? 'multiply' : 'add';
      const posVal = posOp === 'multiply' ? (Math.random() > 0.7 ? 3 : 2) : Math.floor(5 + Math.random() * (10 + levelNum * 2));
      const posGate = {
        op: posOp as 'multiply' | 'add',
        value: posVal,
        label: posOp === 'multiply' ? `×${posVal}` : `+${posVal}`,
        isPositive: true,
      };

      // Alternative gate (can be negative or smaller positive)
      const isAltNegative = Math.random() > 0.35;
      let altGate;
      if (isAltNegative) {
        const subVal = Math.floor(3 + Math.random() * (5 + levelNum));
        altGate = {
          op: 'subtract' as const,
          value: subVal,
          label: `-${subVal}`,
          isPositive: false,
        };
      } else {
        const addVal = Math.max(1, Math.floor(posVal * 0.5));
        altGate = {
          op: 'add' as const,
          value: addVal,
          label: `+${addVal}`,
          isPositive: true,
        };
      }

      // Randomize which side is left vs right
      const isLeftBetter = Math.random() > 0.5;
      const leftGate = isLeftBetter ? posGate : altGate;
      const rightGate = isLeftBetter ? altGate : posGate;

      const gatePair: GatePair = {
        id: `gate_${levelNum}_${i}`,
        z: zPos,
        leftGate,
        rightGate,
        passed: false,
      };

      this.gates.push(gatePair);
      this.createGateMesh(gatePair);
    }

    // Alien Boss Setup
    const bossHp = Math.round(75 * Math.pow(1.65, levelNum - 1));
    const bossTypes: BossData['type'][] = ['CORE', 'SENTINEL', 'DREADNOUGHT', 'QUEEN'];
    const chosenType = bossTypes[(levelNum - 1) % bossTypes.length];
    const bossNames = [
      'XENO-CORE V1',
      'VOID SENTINEL',
      'NEO DREADNOUGHT',
      'BIO-QUEEN MATRIX',
      'CHRONO TITAN',
      'CYBER OVERLORD',
    ];

    this.bossData = {
      name: bossNames[(levelNum - 1) % bossNames.length],
      maxHp: bossHp,
      currentHp: bossHp,
      type: chosenType,
      color: '#ff2d55',
    };

    this.createBossMesh();

    // Spawning initial starting squad based on upgrade
    const startingCount = this.upgrades.startingUnitsLevel;
    for (let i = 0; i < startingCount; i++) {
      this.spawnNanite(0, this.CANNON_Z - 1.5 - i * 0.4);
    }

    this.callbacks.onBossHpUpdate(this.bossData.currentHp, this.bossData.maxHp);
    this.callbacks.onScoreUpdate(this.units.length);
  }

  private clearLevelEntities() {
    // Clear units
    this.units.forEach(u => this.scene.remove(u.mesh));
    this.units = [];

    // Clear gates
    this.gateMeshes.forEach(m => this.scene.remove(m));
    this.gateMeshes = [];

    // Clear boss
    if (this.bossGroup) {
      this.scene.remove(this.bossGroup);
      this.bossGroup = null;
    }
    this.bossShieldRings = [];

    // Clear particles
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];
  }

  /**
   * Procedural Multiplier Gate Mesh
   */
  private createGateMesh(gatePair: GatePair) {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, gatePair.z);

    const halfWidth = this.TRACK_WIDTH / 2;
    const gateWidth = halfWidth - 0.2;
    const gateHeight = 3.6;

    // Left Gate Arch & Panel
    const leftSubgroup = this.buildSingleGateSubmesh(
      gatePair.leftGate,
      -gateWidth / 2 - 0.1,
      gateWidth,
      gateHeight
    );
    // Right Gate Arch & Panel
    const rightSubgroup = this.buildSingleGateSubmesh(
      gatePair.rightGate,
      gateWidth / 2 + 0.1,
      gateWidth,
      gateHeight
    );

    gateGroup.add(leftSubgroup, rightSubgroup);
    this.gateMeshes.push(gateGroup);
    this.scene.add(gateGroup);
  }

  private buildSingleGateSubmesh(
    gate: GatePair['leftGate'],
    xPos: number,
    width: number,
    height: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.x = xPos;

    const isPositive = gate.isPositive;
    const mainColor = isPositive ? 0x00f3ff : 0xff2a55;
    const emissiveColor = isPositive ? 0x00aacc : 0xaa1133;

    // Glowing Neon Hologram Energy Curtain
    const curtainGeom = new THREE.PlaneGeometry(width, height);
    curtainGeom.translate(0, height / 2, 0);
    const curtainMat = new THREE.MeshBasicMaterial({
      color: mainColor,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const curtain = new THREE.Mesh(curtainGeom, curtainMat);
    group.add(curtain);

    // Frame Border Arch
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      emissive: emissiveColor,
      emissiveIntensity: 0.8,
      metalness: 0.85,
      roughness: 0.2,
    });

    // Top beam
    const topBeamGeom = new THREE.BoxGeometry(width + 0.1, 0.25, 0.35);
    const topBeam = new THREE.Mesh(topBeamGeom, frameMat);
    topBeam.position.set(0, height, 0);

    // Pillars
    const pillarGeom = new THREE.BoxGeometry(0.2, height, 0.35);
    const pLeft = new THREE.Mesh(pillarGeom, frameMat);
    pLeft.position.set(-width / 2, height / 2, 0);
    const pRight = new THREE.Mesh(pillarGeom, frameMat);
    pRight.position.set(width / 2, height / 2, 0);

    group.add(topBeam, pLeft, pRight);

    // Text Label Billboard Canvas Texture
    const labelTexture = this.createGateCanvasTexture(gate.label, isPositive);
    const labelGeom = new THREE.PlaneGeometry(2.4, 1.2);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const labelMesh = new THREE.Mesh(labelGeom, labelMat);
    labelMesh.position.set(0, height * 0.65, 0.05);
    group.add(labelMesh);

    return group;
  }

  private createGateCanvasTexture(text: string, isPositive: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Background badge
    ctx.clearRect(0, 0, 256, 128);

    ctx.fillStyle = isPositive ? 'rgba(0, 30, 45, 0.85)' : 'rgba(45, 5, 15, 0.85)';
    ctx.strokeStyle = isPositive ? '#00f3ff' : '#ff2a55';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(16, 16, 224, 96, 16);
    ctx.fill();
    ctx.stroke();

    // Text glow
    ctx.font = 'bold 58px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isPositive ? '#00f3ff' : '#ff4d6d';
    ctx.shadowColor = isPositive ? '#00f3ff' : '#ff2a55';
    ctx.shadowBlur = 18;
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Procedural 3D Alien Boss Monolith / Xenocore
   */
  private createBossMesh() {
    if (!this.bossData) return;

    this.bossGroup = new THREE.Group();
    this.bossGroup.position.set(0, 3.2, this.bossZ);

    // Part 1: Central Alien Core (Geometric Polyhedron)
    const coreGeom = new THREE.IcosahedronGeometry(2.2, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff0044,
      emissive: 0xee0033,
      emissiveIntensity: 2.5,
      metalness: 0.9,
      roughness: 0.15,
      wireframe: false,
    });
    this.bossCoreMesh = new THREE.Mesh(coreGeom, coreMat);
    this.bossCoreMesh.castShadow = true;
    this.bossGroup.add(this.bossCoreMesh);

    // Part 2: Inner Dark Crystal Frame
    const innerGeom = new THREE.OctahedronGeometry(1.6, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x110208,
      metalness: 0.95,
      roughness: 0.1,
    });
    const innerCrystal = new THREE.Mesh(innerGeom, innerMat);
    this.bossGroup.add(innerCrystal);

    // Part 3: Orbiting Bio-Mechanical Defense Rings
    const ringGeom = new THREE.TorusGeometry(3.4, 0.12, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x330514,
      emissive: 0xff0055,
      emissiveIntensity: 1.2,
      metalness: 0.9,
      roughness: 0.2,
    });

    const ring1 = new THREE.Mesh(ringGeom, ringMat);
    ring1.rotation.x = Math.PI / 3;
    const ring2 = new THREE.Mesh(ringGeom, ringMat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.z = Math.PI / 6;

    this.bossShieldRings.push(ring1, ring2);
    this.bossGroup.add(ring1, ring2);

    // Part 4: Floating 3D HP Bar & Numeric Billboard
    this.updateBossBillboard();

    this.scene.add(this.bossGroup);
  }

  private updateBossBillboard() {
    if (!this.bossGroup || !this.bossData) return;

    if (this.bossHpBarMesh) {
      this.bossGroup.remove(this.bossHpBarMesh);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Draw cyber health bar
    ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
    ctx.fillRect(20, 20, 472, 88);
    ctx.strokeStyle = '#ff2a55';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 472, 88);

    // Progress bar fill
    const healthRatio = Math.max(0, this.bossData.currentHp / this.bossData.maxHp);
    const barWidth = 464 * healthRatio;
    const gradient = ctx.createLinearGradient(24, 0, 488, 0);
    gradient.addColorStop(0, '#ff0055');
    gradient.addColorStop(1, '#ff6b8b');
    ctx.fillStyle = gradient;
    ctx.fillRect(24, 24, barWidth, 80);

    // Boss Name & HP text
    ctx.font = 'bold 38px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillText(`${this.bossData.name} : ${this.bossData.currentHp} HP`, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const planeGeom = new THREE.PlaneGeometry(6.0, 1.5);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.bossHpBarMesh = new THREE.Mesh(planeGeom, planeMat);
    this.bossHpBarMesh.position.set(0, 4.2, 0);
    this.bossGroup.add(this.bossHpBarMesh);
  }

  /**
   * Spawn a 3D Nanite Robot Unit
   */
  public spawnNanite(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0.35, z);

    // Part 1: Futuristic Hexagonal Nanite Body
    const bodyGeom = new THREE.ConeGeometry(0.18, 0.45, 5);
    bodyGeom.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00c8e6,
      emissiveIntensity: 1.8,
      metalness: 0.9,
      roughness: 0.15,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(body);

    // Part 2: Orbiting Energy Particle
    const orbGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
    });
    const orb = new THREE.Mesh(orbGeom, orbMat);
    orb.position.set(0, 0.1, -0.15);
    group.add(orb);

    this.scene.add(group);

    const unitPower = 1 + (this.upgrades.unitPowerLevel - 1) * 0.5;

    this.units.push({
      mesh: group,
      pos: group.position,
      targetOffset: new THREE.Vector2((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6),
      speed: 26.0,
      alive: true,
      power: unitPower,
      passedGates: new Set(),
    });
  }

  /**
   * Event Listeners for Touch and Mouse Dragging
   */
  private setupEventListeners() {
    const dom = this.renderer.domElement;

    // Pointer Down
    const onPointerDown = (clientX: number) => {
      sound.unlockAudio();
      this.isDragging = true;
      this.dragStartX = clientX;
      this.cannonDragOriginX = this.cannonTargetX;

      if (this.state === 'MENU') {
        this.startGame();
      }
    };

    // Pointer Move
    const onPointerMove = (clientX: number) => {
      if (!this.isDragging) return;
      const rect = dom.getBoundingClientRect();
      const deltaX = clientX - this.dragStartX;
      const sensitivity = 0.022; // smooth direct drag response
      const newX = this.cannonDragOriginX + deltaX * sensitivity;
      const maxClamp = (this.TRACK_WIDTH / 2) - 0.9;
      this.cannonTargetX = THREE.MathUtils.clamp(newX, -maxClamp, maxClamp);
    };

    // Pointer Up
    const onPointerUp = () => {
      this.isDragging = false;
    };

    dom.addEventListener('mousedown', (e) => onPointerDown(e.clientX));
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX));
    window.addEventListener('mouseup', onPointerUp);

    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        onPointerDown(e.touches[0].clientX);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX);
      }
    }, { passive: true });

    window.addEventListener('touchend', onPointerUp);

    // Resize handler
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (this.isDestroyed || !this.renderer) return;
    const width = this.container.clientWidth || 390;
    const height = this.container.clientHeight || 750;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public startGame() {
    this.state = 'PLAYING';
    this.callbacks.onStateChange('PLAYING');
    this.loadLevel(this.currentLevel);
  }

  public restartLevel() {
    this.startGame();
  }

  public nextLevel() {
    this.currentLevel += 1;
    this.startGame();
  }

  /**
   * Main Simulation Loop
   */
  private animate = () => {
    if (this.isDestroyed) return;

    this.animId = requestAnimationFrame(this.animate);
    const delta = Math.min(this._clock.getDelta(), 0.1);

    // Update grid time uniform for flowing neon floor
    if (this.gridMaterial) {
      this.gridMaterial.uniforms.uTime.value += delta;
    }

    // Smooth Cannon horizontal damping
    this.cannonCurrentX = THREE.MathUtils.damp(this.cannonCurrentX, this.cannonTargetX, 16, delta);
    this.cannonGroup.position.x = this.cannonCurrentX;

    // Cannon recoil recovery
    if (this.cannonRecoil > 0) {
      this.cannonRecoil = Math.max(0, this.cannonRecoil - delta * 4);
      this.barrelLeft.position.z = -0.6 + this.cannonRecoil * 0.2;
      this.barrelRight.position.z = -0.6 + this.cannonRecoil * 0.2;
    }

    // Auto-fire nanite units while playing
    if (this.state === 'PLAYING') {
      const shotsPerSec = 4 + this.upgrades.fireRateLevel * 1.2;
      this.fireTimer += delta;
      if (this.fireTimer >= 1 / shotsPerSec) {
        this.fireTimer = 0;
        this.fireCannonShot();
      }
    }

    // Update Boss Animation
    if (this.bossGroup && this.bossCoreMesh) {
      this.bossCoreMesh.rotation.y += delta * 1.5;
      this.bossCoreMesh.rotation.x += delta * 0.8;
      this.bossShieldRings.forEach((ring, idx) => {
        ring.rotation.z += delta * (idx === 0 ? 2.0 : -2.2);
      });
      // Floating hover bobbing
      this.bossGroup.position.y = 3.2 + Math.sin(this._clock.getElapsedTime() * 3) * 0.4;
    }

    // Update Units
    this.updateUnits(delta);

    // Update Particles
    this.updateParticles(delta);

    // Screen Shake effect
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 6);
      this.camera.position.x = (Math.random() - 0.5) * this.shakeIntensity * 0.6;
      this.camera.position.y = 8.5 + (Math.random() - 0.5) * this.shakeIntensity * 0.6;
    } else {
      this.camera.position.x = 0;
      this.camera.position.y = 8.5;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private fireCannonShot() {
    this.cannonRecoil = 1.0;
    const barrelOffset = Math.random() > 0.5 ? -0.35 : 0.35;
    this.spawnNanite(this.cannonCurrentX + barrelOffset, this.CANNON_Z - 1.2);
    sound.playShoot();
    this.callbacks.onScoreUpdate(this.units.length);
  }

  private updateUnits(delta: number) {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i];
      if (!unit.alive) continue;

      // Move forward along Z
      unit.pos.z -= unit.speed * delta;

      // Subtle flocking wiggle
      unit.mesh.rotation.z += delta * 5.0;

      // Check collision with Gates
      for (const gate of this.gates) {
        if (gate.passed) continue;

        // Has unit crossed gate Z plane?
        const zDist = unit.pos.z - gate.z;
        if (Math.abs(zDist) < 1.0 && !unit.passedGates.has(gate.id)) {
          unit.passedGates.add(gate.id);

          const isLeft = unit.pos.x < 0;
          const chosenGate = isLeft ? gate.leftGate : gate.rightGate;

          this.applyGateEffect(chosenGate, unit);
          break;
        }
      }

      // Check collision with Alien Boss
      if (this.bossData && unit.pos.z <= this.bossZ + 1.8) {
        unit.alive = false;
        this.scene.remove(unit.mesh);
        this.units.splice(i, 1);

        this.damageBoss(unit.power);
        continue;
      }

      // Despawn if past arena
      if (unit.pos.z < this.bossZ - 10) {
        unit.alive = false;
        this.scene.remove(unit.mesh);
        this.units.splice(i, 1);
      }
    }

    this.callbacks.onScoreUpdate(this.units.length);

    // Check Level Complete / Fail Condition
    if (this.state === 'PLAYING') {
      if (this.bossData && this.bossData.currentHp <= 0) {
        this.handleVictory();
      } else if (this.units.length === 0 && this.bossData && this.bossData.currentHp > 0) {
        // If cannon has passed all gates or player has no units
        // Give small buffer
      }
    }
  }

  private applyGateEffect(gate: GatePair['leftGate'], triggerUnit: NaniteUnit) {
    if (gate.isPositive) {
      sound.playGatePositive();
      this.callbacks.onFloatingText(gate.label, true);

      // Spawn multiplier particles
      this.createGateBlast(triggerUnit.pos.x, triggerUnit.pos.z, true);

      if (gate.op === 'multiply') {
        const factor = gate.value - 1; // already have 1 unit
        for (let k = 0; k < factor; k++) {
          const offsetX = (Math.random() - 0.5) * 1.2;
          const offsetZ = (Math.random() - 0.5) * 0.8;
          this.spawnNanite(triggerUnit.pos.x + offsetX, triggerUnit.pos.z + offsetZ);
        }
      } else if (gate.op === 'add') {
        for (let k = 0; k < gate.value; k++) {
          const offsetX = (Math.random() - 0.5) * 1.5;
          const offsetZ = (Math.random() - 0.5) * 1.0;
          this.spawnNanite(triggerUnit.pos.x + offsetX, triggerUnit.pos.z + offsetZ);
        }
      }
    } else {
      sound.playGateNegative();
      this.callbacks.onFloatingText(gate.label, false);
      this.createGateBlast(triggerUnit.pos.x, triggerUnit.pos.z, false);

      if (gate.op === 'subtract') {
        // Vaporize up to gate.value nearby units
        let removed = 0;
        for (let j = this.units.length - 1; j >= 0 && removed < gate.value; j--) {
          const u = this.units[j];
          if (u.alive && Math.abs(u.pos.z - triggerUnit.pos.z) < 4.0) {
            u.alive = false;
            this.scene.remove(u.mesh);
            this.units.splice(j, 1);
            removed++;
          }
        }
      }
    }
  }

  private damageBoss(damage: number) {
    if (!this.bossData) return;

    this.bossData.currentHp = Math.max(0, this.bossData.currentHp - Math.round(damage));
    this.updateBossBillboard();
    this.callbacks.onBossHpUpdate(this.bossData.currentHp, this.bossData.maxHp);

    sound.playBossHit();
    this.shakeIntensity = 0.45;

    // Spawn impact spark particles
    this.createImpactSparks(
      (Math.random() - 0.5) * 2.0,
      3.2 + (Math.random() - 0.5) * 2.0,
      this.bossZ + 1.2
    );

    // Coins dropped on hit
    const coinChance = 0.35;
    if (Math.random() < coinChance) {
      const coinGain = Math.round(1 * (1 + (this.upgrades.coinMultiplierLevel - 1) * 0.25));
      this.callbacks.onCoinEarned(coinGain);
      sound.playCoin();
    }

    if (this.bossData.currentHp <= 0) {
      this.handleVictory();
    }
  }

  private handleVictory() {
    this.state = 'VICTORY';
    this.callbacks.onStateChange('VICTORY');

    sound.playBossDefeated();
    setTimeout(() => {
      sound.playVictory();
    }, 400);

    // Giant explosion particles
    for (let i = 0; i < 48; i++) {
      this.createImpactSparks(
        (Math.random() - 0.5) * 4.0,
        3.2 + (Math.random() - 0.5) * 3.0,
        this.bossZ,
        true
      );
    }

    // Award level coins
    const baseReward = 50 + this.currentLevel * 25;
    const finalReward = Math.round(baseReward * (1 + (this.upgrades.coinMultiplierLevel - 1) * 0.25));
    this.callbacks.onCoinEarned(finalReward);
  }

  private createGateBlast(x: number, z: number, isPositive: boolean) {
    const color = isPositive ? 0x00f3ff : 0xff2a55;
    const ringGeom = new THREE.RingGeometry(0.3, 0.45, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(x, 1.2, z);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    this.particles.push({
      mesh: ring,
      vel: new THREE.Vector3(0, 0, -2),
      life: 0.35,
      maxLife: 0.35,
    });
  }

  private createImpactSparks(x: number, y: number, z: number, isMega: boolean = false) {
    const count = isMega ? 24 : 6;
    for (let i = 0; i < count; i++) {
      const geom = new THREE.SphereGeometry(isMega ? 0.18 : 0.08, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x00f3ff : 0xffaa00,
        blending: THREE.AdditiveBlending,
      });
      const spark = new THREE.Mesh(geom, mat);
      spark.position.set(x, y, z);
      this.scene.add(spark);

      this.particles.push({
        mesh: spark,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 8.0,
          Math.random() * 6.0 + 1.0,
          (Math.random() - 0.5) * 8.0
        ),
        life: 0.5,
        maxLife: 0.5,
      });
    }
  }

  private updateParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.vel, delta);
      // Fade out
      const material = p.mesh.material as THREE.Material & { opacity?: number };
      if (material && material.opacity !== undefined) {
        material.opacity = p.life / p.maxLife;
      }
      p.mesh.scale.multiplyScalar(0.96);
    }
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);

    this.clearLevelEntities();
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
