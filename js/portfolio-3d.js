import * as THREE from 'three';

const IMAGES = [
  'assets/images/tattoos/tattoo-03.jpg',
  'assets/images/tattoos/tattoo-04.jpg',
  'assets/images/tattoos/tattoo-05.jpg',
  'assets/images/tattoos/tattoo-06.jpg',
  'assets/images/tattoos/tattoo-07.jpg',
  'assets/images/tattoos/tattoo-08.jpg',
  'assets/images/tattoos/tattoo-09.jpg',
  'assets/images/tattoos/tattoo-10.jpg',
  'assets/images/tattoos/tattoo-11.jpg',
  'assets/images/tattoos/tattoo-13.jpg',
];

const VISIBLE_COUNT = 22;   // viele gleichzeitig sichtbare Planes
const SCALE_BASE    = 4.5;  // deutlich größere Bilder
const SPEED         = 1.0;
const DEPTH_RANGE   = 70;   // mehr Tiefe für 22 Planes
const MAX_H_OFFSET  = 9;
const MAX_V_OFFSET  = 5.5;

const FADE = {
  fadeIn:  { start: 0.03, end: 0.20 },
  fadeOut: { start: 0.44, end: 0.48 },
};
const BLUR = {
  blurIn:  { start: 0.00, end: 0.08 },
  blurOut: { start: 0.44, end: 0.48 },
  maxBlur: 7.0,
};

/* ---- Shaders (cloth-wave + blur) ---- */
const VERT = `
  uniform float scrollForce;
  uniform float time;
  uniform float isHovered;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float ci = scrollForce * 0.3;
    float d  = length(pos.xy);
    float curve = d * d * ci;
    float r1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
    float r2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
    float cloth = (r1 + r2) * abs(ci) * 2.0;
    float flag = 0.0;
    if (isHovered > 0.5) {
      float damp = smoothstep(-0.5, 0.5, pos.x);
      flag = sin(pos.x * 3.0 + time * 8.0)  * 0.08 * damp
           + sin(pos.x * 5.0 + time * 12.0) * 0.025 * damp;
    }
    pos.z -= (curve + cloth + flag);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = `
  uniform sampler2D map;
  uniform float opacity;
  uniform float blurAmount;
  uniform float scrollForce;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(map, vUv);
    if (blurAmount > 0.01) {
      vec2 off = vec2(blurAmount * 0.0009);
      vec4 blurred = vec4(0.0);
      float total  = 0.0;
      for (float x = -2.0; x <= 2.0; x += 1.0) {
        for (float y = -2.0; y <= 2.0; y += 1.0) {
          float w = 1.0 / (1.0 + length(vec2(x, y)));
          blurred += texture2D(map, vUv + vec2(x, y) * off) * w;
          total += w;
        }
      }
      color = blurred / total;
    }
    color.rgb += vec3(abs(scrollForce) * 0.004);
    gl_FragColor = vec4(color.rgb, color.a * opacity);
  }
`;

function makeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite:  false,
    uniforms: {
      map:        { value: null },
      opacity:    { value: 1.0 },
      blurAmount: { value: 0.0 },
      scrollForce:{ value: 0.0 },
      time:       { value: 0.0 },
      isHovered:  { value: 0.0 },
    },
    vertexShader:   VERT,
    fragmentShader: FRAG,
  });
}

function spatialPositions(count) {
  return Array.from({ length: count }, (_, i) => ({
    x: (Math.sin((i * 2.618)               % (Math.PI * 2)) * (i % 3) * 1.2 * MAX_H_OFFSET) / 3,
    y: (Math.cos((i * 1.618 + Math.PI / 3) % (Math.PI * 2)) * ((i + 1) % 4) * 0.8 * MAX_V_OFFSET) / 4,
  }));
}

/* ---- Lightbox ---- */
let lbIndex = 0;

function updateLightboxImage() {
  const lb      = document.getElementById('portfolio-lightbox');
  const img     = lb.querySelector('.portfolio__lb-img');
  const counter = lb.querySelector('.portfolio__lb-counter');
  img.src = IMAGES[lbIndex];
  if (counter) counter.textContent = `${lbIndex + 1} / ${IMAGES.length}`;
}

function openLightbox(index) {
  lbIndex = ((index % IMAGES.length) + IMAGES.length) % IMAGES.length;
  const lb = document.getElementById('portfolio-lightbox');
  lb.classList.add('portfolio__lb--open');
  document.body.style.overflow = 'hidden';
  updateLightboxImage();
  lb.querySelector('.portfolio__lb-close').focus();
}

function closeLightbox() {
  const lb = document.getElementById('portfolio-lightbox');
  lb.classList.remove('portfolio__lb--open');
  document.body.style.overflow = '';
}

function lightboxPrev() {
  lbIndex = (lbIndex - 1 + IMAGES.length) % IMAGES.length;
  updateLightboxImage();
}

function lightboxNext() {
  lbIndex = (lbIndex + 1) % IMAGES.length;
  updateLightboxImage();
}

/* ---- Main class ---- */
class Gallery3D {
  constructor(container) {
    this.container  = container;
    this.vel        = 0;
    this.autoPlay   = true;
    this.pointer    = new THREE.Vector2(-9, -9);
    this.raycaster  = new THREE.Raycaster();
    this.hoveredMesh = null;
    this.clock      = new THREE.Clock();
    this.raf        = null;
    this._ptrDown   = null; // for click-vs-drag detection

    this._initRenderer();
    this._loadTextures(IMAGES).then(textures => {
      this.textures = textures;
      this._build();
      this._bindEvents();
      this._loop();
    });
  }

  _initRenderer() {
    const { width, height } = this.container.getBoundingClientRect();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    // Transparent clear → CSS-Smoke-Background scheint durch
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
    this.camera.position.set(0, 0, 0);
  }

  _loadTextures(srcs) {
    const loader = new THREE.TextureLoader();
    return Promise.all(srcs.map(src =>
      new Promise(resolve => {
        loader.load(src, tex => {
          tex.colorSpace = THREE.SRGBColorSpace;
          resolve(tex);
        }, undefined, () => resolve(null));
      })
    )).then(ts => ts.filter(Boolean));
  }

  _build() {
    const n   = Math.min(VISIBLE_COUNT, this.textures.length * 2);
    this.n    = n;
    const pos = spatialPositions(n);
    this.materials = Array.from({ length: n }, makeMaterial);

    this.planes = Array.from({ length: n }, (_, i) => ({
      i,
      imageIndex: i % this.textures.length,
      z: ((DEPTH_RANGE / n) * i) % DEPTH_RANGE,
      x: pos[i].x,
      y: pos[i].y,
    }));

    this.meshes = this.planes.map((p, i) => {
      const mat = this.materials[i];
      const tex = this.textures[p.imageIndex];
      mat.uniforms.map.value = tex;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 32, 32), mat);
      this._applyScale(mesh, tex);
      mesh.position.set(p.x, p.y, p.z - DEPTH_RANGE / 2);
      mesh.userData.planeIndex = i;
      this.scene.add(mesh);
      return mesh;
    });
  }

  _applyScale(mesh, tex) {
    if (!tex?.image) { mesh.scale.set(SCALE_BASE, SCALE_BASE, 1); return; }
    const a  = tex.image.width / tex.image.height;
    const sw = a >= 1 ? SCALE_BASE * a : SCALE_BASE;
    const sh = a >= 1 ? SCALE_BASE     : SCALE_BASE / a;
    mesh.scale.set(sw, sh, 1);
  }

  _bindEvents() {
    const canvas = this.renderer.domElement;


    /* Pointer move → hover + pointer position */
    this._onMove = e => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - r.left) / r.width)  * 2 - 1,
        -((e.clientY - r.top)  / r.height) * 2 + 1
      );
    };

    /* Click detection (ignore drags) */
    this._onPtrDown = e => {
      this._ptrDown = { x: e.clientX, y: e.clientY };
    };
    this._onPtrUp = e => {
      if (!this._ptrDown) return;
      const dx = e.clientX - this._ptrDown.x;
      const dy = e.clientY - this._ptrDown.y;
      this._ptrDown = null;
      if (Math.sqrt(dx * dx + dy * dy) < 5) this._onClick(e);
    };

    /* Resize */
    this._onResize = () => {
      const { width, height } = this.container.getBoundingClientRect();
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    /* Lightbox keyboard */
    this._onLbKey = e => {
      const lb = document.getElementById('portfolio-lightbox');
      if (!lb.classList.contains('portfolio__lb--open')) return;
      if (e.key === 'Escape')      { e.stopPropagation(); closeLightbox(); }
      else if (e.key === 'ArrowLeft')  { e.stopPropagation(); lightboxPrev(); }
      else if (e.key === 'ArrowRight') { e.stopPropagation(); lightboxNext(); }
    };

    /* Lightbox swipe */
    this._lbTouchStart = null;
    this._onLbTouchStart = e => { this._lbTouchStart = e.touches[0].clientX; };
    this._onLbTouchEnd   = e => {
      if (this._lbTouchStart === null) return;
      const dx = e.changedTouches[0].clientX - this._lbTouchStart;
      this._lbTouchStart = null;
      if (Math.abs(dx) < 40) return;
      dx < 0 ? lightboxNext() : lightboxPrev();
    };

    canvas.addEventListener('pointermove',  this._onMove);
    canvas.addEventListener('pointerdown',  this._onPtrDown);
    canvas.addEventListener('pointerup',    this._onPtrUp);
    window.addEventListener('keydown',      this._onLbKey);
    window.addEventListener('resize',       this._onResize);

    /* Lightbox events */
    const lb = document.getElementById('portfolio-lightbox');
    if (lb) {
      lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
      lb.querySelector('.portfolio__lb-close')?.addEventListener('click', closeLightbox);
      lb.querySelector('.portfolio__lb-prev')?.addEventListener('click', e => { e.stopPropagation(); lightboxPrev(); });
      lb.querySelector('.portfolio__lb-next')?.addEventListener('click', e => { e.stopPropagation(); lightboxNext(); });
      lb.addEventListener('touchstart', this._onLbTouchStart, { passive: true });
      lb.addEventListener('touchend',   this._onLbTouchEnd,   { passive: true });
    }
  }

  _onClick(e) {
    const canvas = this.renderer.domElement;
    const r      = canvas.getBoundingClientRect();
    const ptr    = new THREE.Vector2(
      ((e.clientX - r.left) / r.width)  * 2 - 1,
      -((e.clientY - r.top)  / r.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ptr, this.camera);
    const hits = this.raycaster.intersectObjects(this.meshes);
    // Skip planes that are faded out (opacity < 0.15) — shader hides them but geometry still intersects
    const hit = hits.find(h => h.object.material.uniforms.opacity.value >= 0.15);
    if (!hit) return;
    const plane = this.planes[hit.object.userData.planeIndex];
    openLightbox(plane.imageIndex);
  }

  _loop() {
    this.raf     = requestAnimationFrame(() => this._loop());
    const delta  = this.clock.getDelta();
    const time   = this.clock.getElapsedTime();
    const canvas = this.renderer.domElement;

    if (this.autoPlay) this.vel += 0.3 * delta;
    this.vel *= 0.95;

    /* Hover */
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.meshes)[0]?.object ?? null;
    if (hit !== this.hoveredMesh) {
      if (this.hoveredMesh) this.hoveredMesh.material.uniforms.isHovered.value = 0.0;
      if (hit)              hit.material.uniforms.isHovered.value              = 1.0;
      this.hoveredMesh = hit;
    }
    canvas.style.cursor = hit ? 'pointer' : 'grab';

    /* Shared uniforms */
    this.materials.forEach(m => {
      m.uniforms.time.value        = time;
      m.uniforms.scrollForce.value = this.vel;
    });

    /* Plane positions + image cycling */
    const total = this.textures.length;
    const adv   = this.n % total || total;

    this.planes.forEach((p, i) => {
      let z = p.z + this.vel * delta * 10;
      let fw = 0, bw = 0;
      if (z >= DEPTH_RANGE)  { fw = Math.floor(z / DEPTH_RANGE);  z -= DEPTH_RANGE * fw; }
      else if (z < 0)        { bw = Math.ceil(-z / DEPTH_RANGE);  z += DEPTH_RANGE * bw; }
      if (fw) p.imageIndex = (p.imageIndex + fw * adv) % total;
      if (bw) p.imageIndex = (((p.imageIndex - bw * adv) % total) + total) % total;
      p.z = ((z % DEPTH_RANGE) + DEPTH_RANGE) % DEPTH_RANGE;

      const mesh   = this.meshes[i];
      const worldZ = p.z - DEPTH_RANGE / 2;
      mesh.position.set(p.x, p.y, worldZ);

      /* Swap texture when plane wraps */
      const tex = this.textures[p.imageIndex];
      if (tex && this.materials[i].uniforms.map.value !== tex) {
        this.materials[i].uniforms.map.value = tex;
        this._applyScale(mesh, tex);
      }

      const np  = p.z / DEPTH_RANGE;
      const mat = this.materials[i];

      /* Opacity */
      let op = 1;
      if      (np < FADE.fadeIn.start)  op = 0;
      else if (np < FADE.fadeIn.end)    op = (np - FADE.fadeIn.start) / (FADE.fadeIn.end  - FADE.fadeIn.start);
      else if (np > FADE.fadeOut.end)   op = 0;
      else if (np > FADE.fadeOut.start) op = 1 - (np - FADE.fadeOut.start) / (FADE.fadeOut.end - FADE.fadeOut.start);
      mat.uniforms.opacity.value = Math.max(0, Math.min(1, op));

      /* Blur */
      const mx = BLUR.maxBlur;
      let   bl = 0;
      if      (np < BLUR.blurIn.start)  bl = mx;
      else if (np < BLUR.blurIn.end)    bl = mx * (1 - (np - BLUR.blurIn.start)  / (BLUR.blurIn.end  - BLUR.blurIn.start));
      else if (np > BLUR.blurOut.end)   bl = mx;
      else if (np > BLUR.blurOut.start) bl = mx *     ((np - BLUR.blurOut.start) / (BLUR.blurOut.end - BLUR.blurOut.start));
      mat.uniforms.blurAmount.value = Math.max(0, Math.min(mx, bl));
    });

    this.renderer.render(this.scene, this.camera);
  }
}

/* ---- Boot ---- */
const container = document.getElementById('portfolio-3d');
if (container) {
  try {
    const test = document.createElement('canvas');
    const gl   = test.getContext('webgl') || test.getContext('experimental-webgl');
    if (gl) {
      new Gallery3D(container);
    } else {
      container.classList.add('portfolio__3d-wrap--fallback');
    }
  } catch {
    container.classList.add('portfolio__3d-wrap--fallback');
  }
}
