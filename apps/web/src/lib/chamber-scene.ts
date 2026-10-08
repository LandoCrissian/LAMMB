// Loaded only after an explicit Enter action. All geometry/textures are original.
import * as THREE from 'three';
import {
  chamber,
  moveObserver,
  nearTerminal,
  type Position,
} from './chamber-model';
export type ChamberSnapshot = Position & {
  yaw: number;
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
  interact: () => void;
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
    this.renderer.toneMappingExposure = 1.3;
    this.scene.fog = new THREE.Fog(0x080f13, 11, 28);
    this.scene.add(new THREE.HemisphereLight(0xb8d5cf, 0x253034, 2.2));
    this.light = new THREE.PointLight(0xdcff00, 16, 12, 2);
    this.light.position.set(0, 3.5, -1);
    this.scene.add(this.light);
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
      color: 0xdcff00,
      emissive: 0xdcff00,
      emissiveIntensity: 2.1,
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
    const specimen = new THREE.Group();
    specimen.position.z = -1;
    this.scene.add(specimen);
    this.box(3.2, 0.22, 2.6, 0, 0.11, 0, edges, specimen);
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
    // Fixed soft contact shade, not a high-cost realtime shadow map.
    const shade = this.label('shade', 4, 3.6, 0, 0.012, -1);
    shade.rotation.x = -Math.PI / 2;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.listen(window, 'keydown', (event) =>
      this.key(event as KeyboardEvent, true),
    );
    this.listen(window, 'keyup', (event) =>
      this.key(event as KeyboardEvent, false),
    );
    this.listen(document, 'pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      if (this.locked && !locked) {
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
    this.listen(canvas, 'pointerdown', (event) => {
      const e = event as PointerEvent;
      if (this.paused || this.lost) return;
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
      this.listen(canvas, type, () => {
        this.drag = null;
      });
    this.listen(canvas, 'webglcontextlost', (event) => {
      event.preventDefault();
      this.lost = true;
      this.setPaused(true);
      hooks.context(true);
    });
    this.listen(canvas, 'webglcontextrestored', () => {
      this.lost = false;
      hooks.context(false);
      this.render();
    });
    this.resize();
  }
  async start(startedAt: number) {
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
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
    this.render();
  }
  private key(e: KeyboardEvent, down: boolean) {
    const target = e.target as HTMLElement | null;
    if (target !== this.canvas && document.pointerLockElement !== this.canvas)
      return;
    const key = e.key.toLowerCase();
    if (
      key === 'e' &&
      down &&
      !e.repeat &&
      !this.paused &&
      nearTerminal(this.position)
    )
      this.hooks.interact();
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
      if (down && !this.paused) this.keys.add(key);
      else this.keys.delete(key);
    }
  }
  private look(dx: number, dy: number) {
    if (this.paused || this.lost) return;
    this.yaw -= dx * 0.003;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.003, -1.15, 1.15);
  }
  setAxis(x: number, y: number) {
    this.axis = { x, y };
  }
  setPaused(value: boolean) {
    this.paused = value;
    this.keys.clear();
    this.axis = { x: 0, y: 0 };
    this.drag = null;
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
    this.keys.clear();
    this.axis = { x: 0, y: 0 };
    this.render();
    this.publish();
  }
  setAlarm(active: boolean) {
    this.light.color.setHex(active ? 0xff2820 : 0xdcff00);
    this.signal.color.setHex(active ? 0xff3828 : 0xdcff00);
    this.signal.emissive.setHex(active ? 0xff2820 : 0xdcff00);
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
  private render() {
    if (this.disposed || this.lost) return;
    this.camera.position.set(
      this.position.x,
      chamber.eyeHeight,
      this.position.z,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.renderer.render(this.scene, this.camera);
  }
  private publish() {
    const info = this.renderer.info;
    this.hooks.snapshot({
      ...this.position,
      yaw: this.yaw,
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
      this.position = moveObserver(
        this.position,
        this.yaw,
        (this.keys.has('d') ? 1 : 0) -
          (this.keys.has('a') ? 1 : 0) +
          this.axis.x,
        (this.keys.has('w') ? 1 : 0) -
          (this.keys.has('s') ? 1 : 0) +
          this.axis.y,
        seconds,
      );
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
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.cleanup.forEach((remove) => remove());
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
