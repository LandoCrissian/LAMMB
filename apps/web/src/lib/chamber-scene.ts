// Loaded only after an explicit Enter action. All geometry/textures are original.
import * as THREE from 'three';
import {
  chamber,
  moveObserver,
  nearTerminal,
  nearbyDestination,
  smoothAxis,
  safeCameraBoom,
  type Destination,
  type Position,
} from './chamber-model';
export type ChamberSnapshot = Position & {
  yaw: number;
  pitch: number;
  perspective: 'first' | 'third';
  destination: Destination;
  inspection: boolean;
  inspectionYaw: number;
  inspectionDistance: number;
  camera: { x: number; y: number; z: number };
  reducedMotion: boolean;
  hovering: boolean;
  avatarVisible: boolean;
  near: boolean;
  fps: number;
  frames: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  loadMs: number;
};
type Hooks = {
  snapshot: (value: ChamberSnapshot) => void;
  ready: () => void;
  pause: () => void;
  interact: (destination: Destination) => void;
  context: (lost: boolean) => void;
  error: () => void;
};
export class ChamberScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(68, 1, 0.08, 40);
  private materials = new Set<THREE.Material>();
  private geometries = new Set<THREE.BufferGeometry>();
  private textures = new Set<THREE.Texture>();
  private cube = this.geometry(new THREE.BoxGeometry(1, 1, 1));
  private terminalTexture: THREE.Texture | null = null;
  private cleanup: (() => void)[] = [];
  private resizeObserver: ResizeObserver;
  private keys = new Set<string>();
  private position: Position = { ...chamber.spawn };
  private yaw = 0;
  private pitch = 0;
  private axis = { x: 0, y: 0 };
  private drag: { id: number; x: number; y: number } | null = null;
  private frame = 0;
  private velocity = { x: 0, y: 0 };
  private perspective: 'first' | 'third' = 'first';
  private specimen = new THREE.Group();
  private avatar = new THREE.Group();
  private inspection = false;
  private inspectionYaw = 0;
  private inspectionPitch = 0.1;
  private inspectionDistance = 5;
  private savedCamera: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
  } | null = null;
  private hidden: THREE.Object3D[] = [];
  private inspectPointers = new Map<number, { x: number; y: number }>();
  private sensitivity = 0.003;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private elapsed = 0;
  private follow = new THREE.Vector3();
  private target = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private disposed = false;
  private paused = false;
  private lost = false;
  private previous = 0;
  private sampleTime = 0;
  private frameCount = 0;
  private totalFrames = 0;
  private fps = 0;
  private lowSamples = 0;
  private loadMs = 0;
  private light: THREE.PointLight;
  private signal: THREE.MeshStandardMaterial;
  private locked = false;
  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: Hooks,
  ) {
    const context = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    if (!context)
      throw new Error(
        'WebGL 2 is unavailable. The text terminal remains fully playable.',
      );
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      antialias: false,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x080f13);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.65;
    this.scene.fog = new THREE.Fog(0x080f13, 16, 35);
    this.scene.add(new THREE.HemisphereLight(0xd7e6ea, 0x57626b, 3.1));
    this.light = new THREE.PointLight(0xdcff00, 16, 12, 2);
    this.light.position.set(0, 3.5, -1);
    this.scene.add(this.light);
    const practical = new THREE.DirectionalLight(0xd6e6ff, 2.4);
    practical.position.set(3, 4.5, 4);
    this.scene.add(practical);
    const spotlight = new THREE.SpotLight(0xeaf6ff, 65, 14, 0.7, 0.55, 1.5);
    spotlight.position.set(0, 4.5, -1);
    spotlight.target.position.set(0, 1.8, -1);
    this.scene.add(spotlight, spotlight.target);
    const blue = new THREE.PointLight(0x7cafcc, 18, 14, 2);
    blue.position.set(3.5, 3.8, 3.5);
    this.scene.add(blue);
    const amber = new THREE.PointLight(0xffb85f, 12, 10, 2);
    amber.position.set(-4, 2.8, -4.5);
    this.scene.add(amber);
    const steel = this.material({
      color: 0x25313a,
      metalness: 0.65,
      roughness: 0.55,
    });
    const black = this.material({
      color: 0x111c23,
      metalness: 0.7,
      roughness: 0.4,
    });
    const edges = this.material({
      color: 0x566470,
      metalness: 0.8,
      roughness: 0.32,
    });
    this.signal = this.material({
      color: 0x466000,
      emissive: 0xbadb00,
      emissiveIntensity: 0.65,
      roughness: 0.65,
    });
    const amberMaterial = this.material({
      color: 0xffb85f,
      emissive: 0xff9f32,
      emissiveIntensity: 1,
    });
    // Shared instanced deck plates: one draw call for the floor.
    const floor = new THREE.InstancedMesh(
      this.geometry(new THREE.BoxGeometry(0.98, 0.08, 0.98)),
      steel,
      168,
    );
    const transform = new THREE.Object3D();
    let index = 0;
    for (let x = -5.5; x <= 5.5; x++)
      for (let z = -6.5; z <= 6.5; z++) {
        transform.position.set(x, -0.04, z);
        transform.updateMatrix();
        floor.setMatrixAt(index++, transform.matrix);
      }
    this.scene.add(floor);
    this.box(12.2, 0.2, 14.2, 0, 4.9, 0, black);
    this.box(0.2, 5, 14.2, -6.1, 2.4, 0, black);
    this.box(0.2, 5, 14.2, 6.1, 2.4, 0, black);
    this.box(12, 5, 0.2, 0, 2.4, -7.1, black);
    this.box(12, 5, 0.2, 0, 2.4, 7.1, black);
    // Alternating panel seams, load-bearing ribs and overhead luminaires.
    for (let z = -6; z <= 6; z += 2) {
      for (const x of [-5.94, 5.94]) {
        this.box(0.08, 3.4, 1.8, x, 2.5, z, steel);
        this.box(0.18, 4.8, 0.13, x * 0.98, 2.4, z - 0.95, edges);
        this.box(0.05, 0.07, 1.5, x * 0.985, 0.45, z, this.signal);
      }
      this.box(10.7, 0.13, 0.16, 0, 4.65, z, edges);
      this.box(2.2, 0.04, 0.12, 0, 4.54, z, this.signal);
    }
    for (const x of [-4.8, 4.8])
      this.box(0.06, 0.008, 12.8, x, 0.006, 0, this.signal);
    // Rear service door and observation glass. Nobody is visible inside.
    this.box(2.2, 3.5, 0.1, 3.4, 1.8, -6.91, edges);
    this.box(1.9, 3.2, 0.12, 3.4, 1.65, -6.8, black);
    this.box(0.035, 2.6, 0.02, 3.4, 1.65, -6.7, amberMaterial);
    this.box(3.4, 1.65, 0.15, -2.8, 2.5, -6.85, edges);
    this.box(
      3.15,
      1.4,
      0.16,
      -2.8,
      2.5,
      -6.7,
      this.material({
        color: 0x355662,
        transparent: true,
        opacity: 0.45,
        metalness: 0.7,
        roughness: 0.1,
      }),
    );
    // Original sealed unit, a procedural interpretation rather than a recovered 3D asset.
    const specimen = this.specimen;
    specimen.position.z = -1;
    this.scene.add(specimen);
    this.box(3.2, 0.22, 2.6, 0, 0.11, -1, edges);
    this.box(2.9, 0.035, 2.3, 0, 0.235, -1, this.signal);
    specimen.position.y = 0.48;
    const outline = new THREE.Shape();
    outline.moveTo(-0.82, -1.35);
    outline.lineTo(0.82, -1.35);
    outline.lineTo(1.02, -1.12);
    outline.lineTo(1.02, 1.12);
    outline.lineTo(0.82, 1.35);
    outline.lineTo(-0.82, 1.35);
    outline.lineTo(-1.02, 1.12);
    outline.lineTo(-1.02, -1.12);
    outline.closePath();
    const body = new THREE.Mesh(
      this.geometry(
        new THREE.ExtrudeGeometry(outline, {
          depth: 1.1,
          bevelEnabled: true,
          bevelSegments: 1,
          steps: 1,
          bevelSize: 0.08,
          bevelThickness: 0.06,
        }),
      ),
      black,
    );
    body.position.set(0, 1.73, -0.55);
    specimen.add(body);
    this.box(1.7, 2.35, 0.08, 0, 1.73, 0.72, steel, specimen);
    for (const x of [-0.91, 0.91]) {
      this.box(0.16, 2.8, 0.18, x, 1.74, 0.73, edges, specimen);
      for (const y of [0.6, 2.8])
        this.box(0.07, 0.4, 0.03, x, y, 0.84, this.signal, specimen);
    }
    for (const y of [0.46, 3.02])
      this.box(1.9, 0.17, 0.16, 0, y, 0.8, edges, specimen);
    for (const x of [-1.16, 1.16])
      this.box(0.05, 2.0, 0.6, x, 1.8, 0, this.signal, specimen);
    this.label('smile', 1.55, 1.85, 0, 1.7, 0.777, specimen);
    this.label(
      'SEALED / 5280\nCONFIDENCE IS NOT A SAFETY FEATURE',
      2.8,
      0.8,
      0,
      3.85,
      -6.85,
    );
    this.label(
      'MAINTENANCE\nDO NOT ASK ABOUT THE BALANCE',
      1.65,
      1.0,
      0,
      1.7,
      -0.7,
      specimen,
      Math.PI,
    );
    // Instanced bolts on the front face.
    const bolts = new THREE.InstancedMesh(
      this.geometry(new THREE.CylinderGeometry(0.045, 0.045, 0.045, 6)),
      edges,
      20,
    );
    for (let i = 0; i < 20; i++) {
      transform.position.set(
        i < 10 ? -0.92 : 0.92,
        0.5 + (i % 10) * 0.27,
        0.85,
      );
      transform.rotation.set(Math.PI / 2, 0, 0);
      transform.updateMatrix();
      bolts.setMatrixAt(i, transform.matrix);
    }
    specimen.add(bolts);
    // Research console, reachable from the south. Its text is also in accessible DOM.
    const terminal = new THREE.Group();
    terminal.position.set(-3.3, 0, 0.4);
    this.scene.add(terminal);
    this.box(1.4, 0.4, 1.1, 0, 0.2, 0, black, terminal);
    this.box(0.5, 1.1, 0.55, 0, 0.7, 0, steel, terminal);
    this.box(1.3, 0.11, 0.95, 0, 1.18, 0, edges, terminal);
    this.box(1.4, 0.95, 0.15, 0, 1.7, -0.18, black, terminal);
    const terminalScreen = this.label(
      'RESEARCH TERMINAL\nSPECIMEN 0004\nFINANCIAL COMPETENCE TEST\nINITIAL BALANCE: $100',
      1.25,
      0.75,
      0,
      1.72,
      -0.09,
      terminal,
    );
    this.terminalTexture = terminalScreen.material.map;
    this.box(0.15, 0.025, 0.15, 0.4, 1.26, 0.28, this.signal, terminal);
    const world = new THREE.Group();
    world.position.set(3.3, 0, 0.4);
    this.scene.add(world);
    this.box(1.4, 0.4, 1.1, 0, 0.2, 0, black, world);
    this.box(0.5, 1.1, 0.55, 0, 0.7, 0, steel, world);
    this.box(1.4, 0.95, 0.15, 0, 1.7, -0.18, black, world);
    this.label(
      'LAMMB WORLD\nGLOBAL NFT ATLAS\nEXPLORE COUNTRIES\nREGISTRY NOT YET LIVE',
      1.25,
      0.75,
      0,
      1.72,
      -0.09,
      world,
    );
    // Temporary original observer: protective suit + opaque visor, no NFT artwork.
    const suit = this.material({ color: 0x6e838d, roughness: 0.8 });
    this.box(0.48, 0.65, 0.3, 0, 1.04, 0, suit, this.avatar);
    this.box(0.36, 0.36, 0.36, 0, 1.58, 0, edges, this.avatar);
    this.box(0.29, 0.13, 0.035, 0, 1.6, -0.2, black, this.avatar);
    for (const x of [-0.16, 0.16])
      this.box(0.18, 0.58, 0.22, x, 0.39, 0, black, this.avatar);
    for (const x of [-0.34, 0.34])
      this.box(0.16, 0.64, 0.2, x, 1, 0, suit, this.avatar);
    this.box(0.15, 0.06, 0.035, 0, 1.2, -0.18, this.signal, this.avatar);
    this.scene.add(this.avatar);
    // Fixed soft contact shade, not a high-cost realtime shadow map.
    const shade = this.label('shade', 4, 3.6, 0, 0.012, -1);
    shade.rotation.x = -Math.PI / 2;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.listen(canvas, 'blur', () => {
      this.keys.clear();
      // Keyboard focus may move to the other thumb; keep its owned touch input.
      if (!this.axis.x && !this.axis.y) this.velocity = { x: 0, y: 0 };
    });
    this.listen(window, 'keydown', (event) =>
      this.key(event as KeyboardEvent, true),
    );
    this.listen(window, 'keyup', (event) =>
      this.key(event as KeyboardEvent, false),
    );
    this.listen(document, 'pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      if (this.locked && !locked && !this.inspection && !this.paused) {
        this.setPaused(true);
        hooks.pause();
      }
      this.locked = locked;
    });
    this.listen(document, 'pointerlockerror', () => {
      this.locked = false;
    });
    this.listen(window, 'blur', () => {
      this.setPaused(true);
      hooks.pause();
    });
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.setPaused(true);
        hooks.pause();
      }
    });
    this.listen(document, 'mousemove', (event) => {
      if (document.pointerLockElement === canvas) {
        const e = event as MouseEvent;
        this.look(e.movementX, e.movementY);
      }
    });
    this.listen(window, 'resize', () => this.clearInput());
    this.listen(this.reducedMotion, 'change', () => {
      this.specimen.position.y = 0.48;
      this.render();
    });
    this.listen(canvas, 'pointerdown', (event) => {
      const e = event as PointerEvent;
      if (
        this.paused ||
        this.lost ||
        this.inspection ||
        this.drag ||
        (e.pointerType === 'touch' && e.clientX < canvas.clientWidth * 0.45)
      )
        return;
      if (document.pointerLockElement === canvas) return;
      canvas.focus();
      canvas.setPointerCapture(e.pointerId);
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    this.listen(canvas, 'pointermove', (event) => {
      const e = event as PointerEvent;
      if (this.drag?.id !== e.pointerId) return;
      this.look(e.clientX - this.drag.x, e.clientY - this.drag.y);
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      this.listen(canvas, type, (event) => {
        if (this.drag?.id === (event as PointerEvent).pointerId)
          this.drag = null;
      });
    this.listen(canvas, 'webglcontextlost', (event) => {
      event.preventDefault();
      this.lost = true;
      this.setPaused(true);
      hooks.context(true);
      // Release caches while the context is lost; recover through a fresh surface.
      this.dispose();
    });
    this.resize();
  }
  async start(startedAt: number) {
    if (this.renderer.extensions.has('KHR_parallel_shader_compile'))
      await this.renderer.compileAsync(this.scene, this.camera);
    else this.renderer.compile(this.scene, this.camera);
    if (this.disposed) return;
    this.updateCamera(0, true);
    this.render();
    this.loadMs = performance.now() - startedAt;
    this.hooks.ready();
    this.publish();
    this.previous = performance.now();
    this.sampleTime = this.previous;
    this.frame = requestAnimationFrame(this.tick);
  }
  private material(options: THREE.MeshStandardMaterialParameters) {
    const result = new THREE.MeshStandardMaterial(options);
    this.materials.add(result);
    return result;
  }
  private geometry<T extends THREE.BufferGeometry>(value: T): T {
    this.geometries.add(value);
    return value;
  }
  private box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Object3D = this.scene,
  ) {
    const mesh = new THREE.Mesh(this.cube, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  }
  private label(
    text: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = this.scene,
    rotate = 0,
  ) {
    const source = document.createElement('canvas');
    source.width = 512;
    source.height = 512;
    const ctx = source.getContext('2d');
    if (!ctx) throw new Error('Texture preparation unavailable');
    if (text === 'smile') {
      ctx.strokeStyle = '#dcff00';
      ctx.fillStyle = '#dcff00';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.arc(256, 200, 160, 0, Math.PI * 2);
      ctx.stroke();
      for (const xx of [205, 307]) {
        ctx.beginPath();
        ctx.ellipse(xx, 166, 12, 28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(256, 195, 92, 0.12, Math.PI - 0.12);
      ctx.stroke();
      for (const [xx, length] of [
        [146, 71],
        [233, 132],
        [286, 99],
        [355, 46],
      ] as const)
        ctx.fillRect(xx, 337, 9, length);
    } else if (text === 'shade') {
      const gradient = ctx.createRadialGradient(256, 256, 20, 256, 256, 240);
      gradient.addColorStop(0, '#000e');
      gradient.addColorStop(1, '#0000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    } else {
      ctx.fillStyle = '#07121a';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#dcff00';
      ctx.textAlign = 'center';
      ctx.font = 'bold 25px monospace';
      text
        .split('\n')
        .forEach((line, i, lines) =>
          ctx.fillText(line, 256, 240 + (i - lines.length / 2) * 48, 480),
        );
    }
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.add(texture);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    this.materials.add(material);
    const mesh = new THREE.Mesh(
      this.geometry(new THREE.PlaneGeometry(w, h)),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotate;
    parent.add(mesh);
    return mesh;
  }
  private listen(target: EventTarget, type: string, callback: EventListener) {
    target.addEventListener(type, callback);
    this.cleanup.push(() => target.removeEventListener(type, callback));
  }
  private resize() {
    if (this.disposed || this.lost) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(
      this.renderer.getPixelRatio(),
      Math.sqrt(1800000 / (rect.width * rect.height)),
    );
    this.renderer.setPixelRatio(Math.max(0.75, ratio));
    this.renderer.setSize(rect.width, rect.height, false);
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    if (this.inspection)
      this.inspectionDistance = Math.max(
        this.minimumInspectionDistance(),
        this.inspectionDistance,
      );
    this.updateCamera(0);
    this.render();
  }
  private key(e: KeyboardEvent, down: boolean) {
    const target = e.target as HTMLElement | null;
    if (target !== this.canvas && document.pointerLockElement !== this.canvas)
      return;
    const key = e.key.toLowerCase();
    if (key === 'e' && down && !e.repeat && !this.paused && !this.inspection)
      this.hooks.interact(nearbyDestination(this.position));
    if (key === 'escape' && down) {
      this.setPaused(true);
      this.hooks.pause();
      return;
    }
    if (
      [
        'w',
        'a',
        's',
        'd',
        'arrowleft',
        'arrowright',
        'arrowup',
        'arrowdown',
      ].includes(key)
    ) {
      e.preventDefault();
      if (down && !this.paused && !this.inspection) this.keys.add(key);
      else this.keys.delete(key);
    }
  }
  private look(dx: number, dy: number) {
    if (this.paused || this.lost || this.inspection) return;
    this.yaw -= dx * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * this.sensitivity,
      -1.15,
      1.15,
    );
  }
  setAxis(x: number, y: number) {
    if (!this.paused && !this.inspection && !this.disposed)
      this.axis = { x, y };
  }
  setPaused(value: boolean) {
    this.paused = value;
    this.clearInput();
    if (value) {
      cancelAnimationFrame(this.frame);
      if (document.pointerLockElement === this.canvas)
        document.exitPointerLock();
    } else if (!this.lost && !this.disposed) {
      cancelAnimationFrame(this.frame);
      this.previous = performance.now();
      this.sampleTime = this.previous;
      this.frameCount = 0;
      this.frame = requestAnimationFrame(this.tick);
    }
  }
  clearInput() {
    this.keys.clear();
    this.axis = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    if (this.drag && this.canvas.hasPointerCapture(this.drag.id))
      this.canvas.releasePointerCapture(this.drag.id);
    this.drag = null;
    this.inspectPointers.clear();
  }
  setSensitivity(value: number) {
    this.sensitivity = THREE.MathUtils.clamp(value, 0.001, 0.006);
  }
  setPerspective(value: 'first' | 'third') {
    this.perspective = value;
    this.clearInput();
    this.updateCamera(0, true);
    this.render();
    this.publish();
  }
  setInspection(value: boolean) {
    if (value === this.inspection || this.disposed) return;
    this.clearInput();
    this.inspection = value;
    if (value) {
      this.savedCamera = {
        position: this.camera.position.clone(),
        quaternion: this.camera.quaternion.clone(),
      };
      if (document.pointerLockElement === this.canvas)
        document.exitPointerLock();
      this.resetInspection();
      this.hidden = this.scene.children.filter(
        (o) => o.visible && o !== this.specimen && !(o instanceof THREE.Light),
      );
      this.hidden.forEach((o) => (o.visible = false));
    } else {
      this.hidden.forEach((o) => (o.visible = true));
      this.hidden = [];
      if (this.savedCamera) {
        this.camera.position.copy(this.savedCamera.position);
        this.camera.quaternion.copy(this.savedCamera.quaternion);
        this.follow.copy(this.camera.position);
      }
      this.savedCamera = null;
    }
    this.render();
    this.publish();
  }
  resetInspection() {
    this.inspectionYaw = 0;
    this.inspectionPitch = 0.1;
    this.inspectionDistance = this.minimumInspectionDistance() + 1.5;
    this.updateCamera(0);
    this.render();
    this.publish();
  }
  inspectPointer(
    type: 'down' | 'move' | 'up',
    id: number,
    x: number,
    y: number,
  ) {
    if (!this.inspection || this.paused) return;
    const prior = this.inspectPointers.get(id);
    if (type === 'up') {
      this.inspectPointers.delete(id);
      return;
    }
    if (type === 'down') {
      this.inspectPointers.set(id, { x, y });
      return;
    }
    if (!prior) return;
    if (this.inspectPointers.size === 2) {
      const other = [...this.inspectPointers].find(([key]) => key !== id)![1];
      const before = Math.hypot(prior.x - other.x, prior.y - other.y);
      const after = Math.hypot(x - other.x, y - other.y);
      if (after > 5 && before > 5)
        this.inspectionDistance = THREE.MathUtils.clamp(
          (this.inspectionDistance * before) / after,
          this.minimumInspectionDistance(),
          Math.max(8, this.minimumInspectionDistance() + 3),
        );
    } else if (this.inspectPointers.size === 1) {
      this.inspectionYaw -= (x - prior.x) * 0.008;
      this.inspectionPitch = THREE.MathUtils.clamp(
        this.inspectionPitch + (y - prior.y) * 0.008,
        -0.5,
        0.65,
      );
    }
    this.inspectPointers.set(id, { x, y });
    this.updateCamera(0);
    this.render();
    this.publish();
  }
  zoomInspection(delta: number) {
    this.inspectionDistance = THREE.MathUtils.clamp(
      this.inspectionDistance + delta,
      this.minimumInspectionDistance(),
      Math.max(8, this.minimumInspectionDistance() + 3),
    );
    this.updateCamera(0);
    this.render();
    this.publish();
  }
  private minimumInspectionDistance() {
    const widthFit =
      1.35 /
        (Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
          this.camera.aspect) +
      0.8;
    return Math.max(
      widthFit,
      this.camera.aspect > 1.5 && this.canvas.clientHeight < 600 ? 5 : 3.3,
    );
  }
  async lockPointer() {
    if (this.paused || this.lost) return;
    this.canvas.focus();
    try {
      await this.canvas.requestPointerLock?.();
    } catch {
      /* Drag-to-look and arrow keys remain usable. */
    }
  }
  resetPosition() {
    this.position = { ...chamber.spawn };
    this.yaw = 0;
    this.pitch = 0;
    this.clearInput();
    this.updateCamera(0, true);
    this.render();
    this.publish();
  }
  setAlarm(active: boolean) {
    this.light.color.setHex(active ? 0xff2820 : 0xdcff00);
    this.signal.color.setHex(active ? 0xff3828 : 0x466000);
    this.signal.emissive.setHex(active ? 0xff2820 : 0xbadb00);
    const texture = this.terminalTexture;
    if (texture) {
      const source = texture.image as HTMLCanvasElement;
      const ctx = source.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#07121a';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = active ? '#ff9589' : '#dcff00';
        ctx.textAlign = 'center';
        ctx.font = 'bold 25px monospace';
        const lines = active
          ? [
              'CURRENT BALANCE: $0.37',
              'OUTSTANDING LOANS: $48,000',
              'SPECIMEN CONFIDENCE: 100%',
              'SUBJECT TECHNICALLY ALIVE',
            ]
          : [
              'RESEARCH TERMINAL',
              'SPECIMEN 0004',
              'FINANCIAL COMPETENCE TEST',
              'INITIAL BALANCE: $100',
            ];
        lines.forEach((line, i) => ctx.fillText(line, 256, 150 + i * 48, 480));
        texture.needsUpdate = true;
      }
    }
    this.render();
  }
  private updateCamera(seconds: number, snap = false) {
    this.avatar.visible = this.perspective === 'third' && !this.inspection;
    this.avatar.position.set(this.position.x, 0, this.position.z);
    this.avatar.rotation.y = this.yaw;
    if (this.inspection) {
      this.target.set(0, 2.15, -1);
      this.camera.position.set(
        Math.sin(this.inspectionYaw) * this.inspectionDistance,
        2.15 + Math.sin(this.inspectionPitch) * this.inspectionDistance,
        -1 +
          Math.cos(this.inspectionYaw) *
            Math.cos(this.inspectionPitch) *
            this.inspectionDistance,
      );
      this.camera.lookAt(this.target);
      return;
    }
    if (this.perspective === 'first') {
      this.camera.position.set(
        this.position.x,
        chamber.eyeHeight,
        this.position.z,
      );
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }
    this.target.set(this.position.x, 1.55, this.position.z);
    this.desired.set(
      this.position.x + Math.sin(this.yaw) * 2.8,
      2.25 - Math.sin(this.pitch) * 1.4,
      this.position.z + Math.cos(this.yaw) * 2.8,
    );
    const safe = safeCameraBoom(
      { x: this.target.x, y: this.target.y, z: this.target.z },
      { x: this.desired.x, y: this.desired.y, z: this.desired.z },
    );
    this.desired.set(safe.x, safe.y, safe.z);
    if (snap) this.follow.copy(this.desired);
    else this.follow.lerp(this.desired, 1 - Math.exp(-10 * seconds));
    const final = safeCameraBoom(
      { x: this.target.x, y: this.target.y, z: this.target.z },
      { x: this.follow.x, y: this.follow.y, z: this.follow.z },
    );
    this.camera.position.set(final.x, final.y, final.z);
    this.target.y += Math.sin(this.pitch) * 1.2;
    this.camera.lookAt(this.target);
    // Collapse gracefully when the camera boom cannot fit beside a wall.
    this.avatar.visible = this.camera.position.distanceTo(this.target) > 1.8;
  }
  private render() {
    if (this.disposed || this.lost) return;

    this.renderer.render(this.scene, this.camera);
  }
  private publish() {
    const info = this.renderer.info;
    this.hooks.snapshot({
      ...this.position,
      yaw: this.yaw,
      pitch: this.pitch,
      perspective: this.perspective,
      destination: nearbyDestination(this.position),
      inspection: this.inspection,
      inspectionYaw: this.inspectionYaw,
      inspectionDistance: this.inspectionDistance,
      camera: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      reducedMotion: this.reducedMotion.matches,
      hovering: !this.reducedMotion.matches,
      avatarVisible: this.avatar.visible,
      near: nearTerminal(this.position),
      fps: this.fps,
      frames: this.totalFrames,
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      pixelRatio: this.renderer.getPixelRatio(),
      loadMs: this.loadMs,
    });
  }
  private tick = (now: number) => {
    if (this.disposed || this.paused || this.lost) return;
    try {
      const seconds = Math.min((now - this.previous) / 1000, 0.05);
      this.previous = now;
      if (!this.inspection) {
        this.yaw +=
          ((this.keys.has('arrowleft') ? 1 : 0) -
            (this.keys.has('arrowright') ? 1 : 0)) *
          seconds;
        this.pitch = THREE.MathUtils.clamp(
          this.pitch +
            ((this.keys.has('arrowup') ? 1 : 0) -
              (this.keys.has('arrowdown') ? 1 : 0)) *
              seconds,
          -1.15,
          1.15,
        );
        this.velocity.x = smoothAxis(
          this.velocity.x,
          (this.keys.has('d') ? 1 : 0) -
            (this.keys.has('a') ? 1 : 0) +
            this.axis.x,
          seconds,
        );
        this.velocity.y = smoothAxis(
          this.velocity.y,
          (this.keys.has('w') ? 1 : 0) -
            (this.keys.has('s') ? 1 : 0) +
            this.axis.y,
          seconds,
        );
        this.position = moveObserver(
          this.position,
          this.yaw,
          this.velocity.x,
          this.velocity.y,
          seconds,
        );
      }
      this.elapsed += seconds;
      this.specimen.position.y =
        0.48 +
        (this.reducedMotion.matches ? 0 : Math.sin(this.elapsed * 0.9) * 0.055);
      this.updateCamera(seconds);
      this.render();
      this.totalFrames++;
      this.frameCount++;
      if (now - this.sampleTime >= 1000) {
        this.fps = Math.round(
          (this.frameCount * 1000) / (now - this.sampleTime),
        );
        this.sampleTime = now;
        this.frameCount = 0;
        if (this.fps < 25) this.lowSamples++;
        else this.lowSamples = 0;
        if (this.lowSamples >= 3 && this.renderer.getPixelRatio() > 0.75) {
          this.renderer.setPixelRatio(
            Math.max(0.75, this.renderer.getPixelRatio() - 0.25),
          );
          this.resize();
          this.lowSamples = 0;
        }
        this.publish();
      }
      this.frame = requestAnimationFrame(this.tick);
    } catch {
      this.setPaused(true);
      this.hooks.error();
    }
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.cleanup.forEach((remove) => remove());
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.scene.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    this.scene.clear();
    this.renderer.dispose();
    if (!this.renderer.getContext().isContextLost())
      this.renderer.forceContextLoss();
  }
}
