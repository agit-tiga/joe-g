'use strict';

const FRAG_SRC = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);
  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);
  col.r-=fbm(uv+vec2(0,T*.015)+n);
  col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);
  col=mix(col,u_color,dot(col,vec3(.21,.71,.07)));
  col=mix(vec3(.08),col,min(time*.1,1.));
  col=clamp(col,.08,1.);
  O=vec4(col,1);
}`;

const VERT_SRC = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255]
    : null;
}

class SmokeRenderer {
  constructor(canvas, color) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) return;
    this.color = hexToRgb(color) || [0.788, 0.659, 0.251];
    this._setup();
    this._init();
  }

  _compile(shader, src) {
    const gl = this.gl;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      console.error('Shader:', gl.getShaderInfoLog(shader));
  }

  _setup() {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER);
    this.fs = gl.createShader(gl.FRAGMENT_SHADER);
    this.program = gl.createProgram();
    this._compile(this.vs, VERT_SRC);
    this._compile(this.fs, FRAG_SRC);
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
      console.error('Program:', gl.getProgramInfoLog(this.program));
  }

  _init() {
    const gl = this.gl;
    const p = this.program;
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(p, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    p.uRes   = gl.getUniformLocation(p, 'resolution');
    p.uTime  = gl.getUniformLocation(p, 'time');
    p.uColor = gl.getUniformLocation(p, 'u_color');
  }

  resize() {
    const dpr = Math.max(1, window.devicePixelRatio);
    const w = this.canvas.offsetWidth  * dpr;
    const h = this.canvas.offsetHeight * dpr;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width  = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  render(now) {
    const gl = this.gl;
    const p  = this.program;
    if (!gl || !gl.isProgram(p)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.uniform2f(p.uRes,   this.canvas.width, this.canvas.height);
    gl.uniform1f(p.uTime,  now * 1e-3);
    gl.uniform3fv(p.uColor, this.color);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    const gl = this.gl;
    if (!gl) return;
    gl.detachShader(this.program, this.vs); gl.deleteShader(this.vs);
    gl.detachShader(this.program, this.fs); gl.deleteShader(this.fs);
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.buf);
  }
}

function initSmokeBackground(canvasId, smokeColor) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const renderer = new SmokeRenderer(canvas, smokeColor);
  if (!renderer.gl) return;

  renderer.resize();

  const onResize = () => renderer.resize();
  window.addEventListener('resize', onResize);

  let rafId;
  function loop(now) {
    renderer.render(now);
    rafId = requestAnimationFrame(loop);
  }
  loop(0);

  return function destroy() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    renderer.destroy();
  };
}

// Brand-Gold #C9A840 als Rauchfarbe
initSmokeBackground('heroSmoke', '#C9A840');
