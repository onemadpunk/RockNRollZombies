// Particles, ambient embers, floating text.
import * as THREE from 'three';

const _o = new THREE.Object3D();
const _c = new THREE.Color();

export class Particles {
  constructor(scene, max, glow) {
    const mat = glow
      ? new THREE.MeshBasicMaterial({ toneMapped: false })
      : new THREE.MeshStandardMaterial({ roughness: 0.9 });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = !glow;
    scene.add(this.mesh);
    this.p = [];
    for (let i = 0; i < max; i++) {
      this.p.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1, g: 0, rot: 0, vr: 0 });
      this.mesh.setColorAt(i, _c.set(0xffffff));
      _o.scale.setScalar(0); _o.updateMatrix(); this.mesh.setMatrixAt(i, _o.matrix);
    }
    this.i = 0;
  }

  emit(pos, { n = 10, color = 0xffffff, speed = 4, up = 2, life = 0.7, size = 0.12, gravity = 12, spread = 1, intensity = 1 } = {}) {
    const cols = Array.isArray(color) ? color : [color];
    for (let k = 0; k < n; k++) {
      const q = this.p[this.i];
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      q.x = pos.x + (Math.random() - 0.5) * 0.3 * spread;
      q.y = pos.y + (Math.random() - 0.5) * 0.3 * spread;
      q.z = (pos.z || 0) + (Math.random() - 0.5) * 0.4;
      q.vx = Math.cos(a) * sp; q.vy = Math.abs(Math.sin(a)) * sp * 0.6 + up; q.vz = (Math.random() - 0.5) * sp * 0.6;
      q.life = q.max = life * (0.6 + Math.random() * 0.6);
      q.s = size * (0.6 + Math.random() * 0.8);
      q.g = gravity; q.rot = Math.random() * 6; q.vr = (Math.random() - 0.5) * 14;
      _c.set(cols[k % cols.length]).multiplyScalar(intensity);
      this.mesh.setColorAt(this.i, _c);
      this.i = (this.i + 1) % this.p.length;
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.p.length; i++) {
      const q = this.p[i];
      if (q.life <= 0) continue;
      q.life -= dt;
      q.vy -= q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < 0.04 && q.g > 0 && q.vy < 0) { q.y = 0.04; q.vy *= -0.3; q.vx *= 0.6; }
      q.rot += q.vr * dt;
      const k = Math.max(0, q.life / q.max);
      _o.position.set(q.x, q.y, q.z);
      _o.rotation.set(q.rot, q.rot * 0.7, 0);
      _o.scale.setScalar(q.life > 0 ? q.s * (0.3 + 0.7 * k) : 0);
      _o.updateMatrix();
      this.mesh.setMatrixAt(i, _o.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Embers and spores drifting through the air around the camera.
export class Embers {
  constructor(scene, n) {
    this.n = n;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    this.v = [];
    const palette = [new THREE.Color(0xff8a3a), new THREE.Color(0xc58cff), new THREE.Color(0xa6ff4d)];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = Math.random() * 12;
      pos[i * 3 + 2] = -10 + Math.random() * 16;
      const c = palette[i % 3];
      col.set([c.r * 2, c.g * 2, c.b * 2], i * 3);
      this.v.push({ vx: (Math.random() - 0.5) * 0.4, vy: 0.2 + Math.random() * 0.5, ph: Math.random() * 6 });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.09, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  update(dt, t, camX) {
    const a = this.points.geometry.attributes.position;
    for (let i = 0; i < this.n; i++) {
      const v = this.v[i];
      let x = a.getX(i) + (v.vx + Math.sin(t + v.ph) * 0.3) * dt;
      let y = a.getY(i) + v.vy * dt;
      if (y > 12) y = 0;
      if (x < camX - 25) x += 50; else if (x > camX + 25) x -= 50;
      a.setXY(i, x, y);
    }
    a.needsUpdate = true;
  }
}

// HTML popups anchored to world positions.
const layer = () => document.getElementById('popups');
const _v = new THREE.Vector3();
export function popup(text, cls, pos, camera) {
  _v.set(pos.x, pos.y, pos.z || 0).project(camera);
  const el = document.createElement('div');
  el.className = 'pop ' + cls;
  el.textContent = text;
  el.style.left = ((_v.x + 1) / 2) * innerWidth + 'px';
  el.style.top = ((1 - _v.y) / 2) * innerHeight + 'px';
  layer().appendChild(el);
  setTimeout(() => el.remove(), 900);
}
