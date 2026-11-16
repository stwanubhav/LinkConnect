import * as THREE from "three";
import { disposeScene, type Chapter, type Ctx } from "./types";

const gridFrag = `
varying vec2 vUv;
uniform float uTime;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float line(vec2 g, float w){ vec2 f = abs(fract(g) - 0.5); return smoothstep(0.5 - w, 0.5, max(f.x, f.y)); }
void main(){
  vec2 g = vUv * vec2(28.0, 18.0);
  float d = length((vUv - vec2(0.5, 0.48)) * vec2(1.6, 1.0));
  float l = line(g, 0.035);
  float s1 = step(hash(floor(g)), 1.1 - d * 2.2);
  l = max(l, s1 * line(g * 2.0, 0.06));
  float s2 = s1 * step(hash(floor(g * 2.0) + 7.0), 0.9 - d * 2.8);
  l = max(l, s2 * line(g * 4.0, 0.1));
  float flick = 0.85 + 0.15 * step(0.5, hash(vec2(floor(uTime * 8.0), floor(g.y))));
  gl_FragColor = vec4(vec3(0.55, 0.75, 0.95) * l * flick * 0.45, 1.0);
}`;

export async function createHero(ctx: Ctx): Promise<Chapter> {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#020408");
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  // Background curved cyber grid
  const gridU = { uTime: { value: 0 } };
  const grid = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, 11, 64, 1, true, Math.PI - 0.85, 1.7),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: gridU,
      vertexShader:
        "varying vec2 vUv; void main(){ vUv = vec2(1.0 - uv.x, uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: gridFrag,
    }),
  );
  grid.position.z = 6.5;
  scene.add(grid);

  // Link Connect 3D Holographic Network Group
  const networkGroup = new THREE.Group();
  scene.add(networkGroup);

  // 1. Central faceted glowing core
  const coreGeo = new THREE.IcosahedronGeometry(1.1, 1);
  const coreWireMat = new THREE.MeshBasicMaterial({
    color: "#00d4ff",
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const coreWire = new THREE.Mesh(coreGeo, coreWireMat);
  networkGroup.add(coreWire);

  const innerGeo = new THREE.IcosahedronGeometry(0.7, 0);
  const innerMat = new THREE.MeshStandardMaterial({
    color: "#0b2cff",
    emissive: "#0055ff",
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.8,
  });
  const innerCore = new THREE.Mesh(innerGeo, innerMat);
  networkGroup.add(innerCore);

  // 2. Orbital Cyber Rings
  const ringGeo1 = new THREE.TorusGeometry(1.8, 0.015, 16, 100);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: "#00d4ff", transparent: true, opacity: 0.6 });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.rotation.x = Math.PI * 0.35;
  ring1.rotation.y = Math.PI * 0.15;
  networkGroup.add(ring1);

  const ringGeo2 = new THREE.TorusGeometry(2.2, 0.012, 16, 100);
  const ringMat2 = new THREE.MeshBasicMaterial({ color: "#22ff00", transparent: true, opacity: 0.45 });
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.rotation.x = -Math.PI * 0.25;
  ring2.rotation.y = Math.PI * 0.4;
  networkGroup.add(ring2);

  // 3. Orbiting Link Nodes
  const nodeCount = 14;
  const nodeGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const nodeMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const nodeInst = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);

  // Array of node orbital parameters: radius, angle, speed, inclination
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    r: 1.5 + (i % 3) * 0.45,
    angle: (i / nodeCount) * Math.PI * 2,
    speed: (0.3 + (i % 4) * 0.15) * (i % 2 === 0 ? 1 : -1),
    incX: (i * 0.45) % Math.PI,
    incY: (i * 0.7) % Math.PI,
  }));
  networkGroup.add(nodeInst);

  // 4. Connection Lines between nodes and core
  const maxLinePoints = (nodeCount + 1) * 2;
  const linePositions = new Float32Array(maxLinePoints * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: "#00d4ff",
    transparent: true,
    opacity: 0.3,
  });
  const linkLines = new THREE.LineSegments(lineGeo, lineMat);
  networkGroup.add(linkLines);

  // 5. Floating background particles
  const particleCount = ctx.mobile ? 40 : 80;
  const partGeo = new THREE.BufferGeometry();
  const partPos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    partPos[i] = (Math.random() - 0.5) * 8;
    partPos[i + 1] = (Math.random() - 0.5) * 6;
    partPos[i + 2] = (Math.random() - 0.5) * 5;
  }
  partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
  const partMat = new THREE.PointsMaterial({
    size: 0.04,
    color: "#60a5fa",
    transparent: true,
    opacity: 0.6,
  });
  const particles = new THREE.Points(partGeo, partMat);
  scene.add(particles);

  // Lights
  const keyLight = new THREE.DirectionalLight("#00d4ff", 2.8);
  keyLight.position.set(4, 2, 4);
  const rimLight = new THREE.DirectionalLight("#3b82f6", 1.5);
  rimLight.position.set(-4, -2, -2);
  const ambient = new THREE.AmbientLight("#ffffff", 0.2);
  scene.add(keyLight, rimLight, ambient);

  let rx = 0;
  let ry = 0;
  const dummyM4 = new THREE.Matrix4();
  const nodeVec = new THREE.Vector3();

  return {
    scene,
    camera,
    update(lp, time, dt, mouse) {
      gridU.uTime.value = time;

      // Mouse parallax rotation
      const k = 1 - Math.exp(-4 * dt);
      ry += (mouse.x * 0.35 - ry) * k;
      rx += (-mouse.y * 0.25 - rx) * k;

      networkGroup.rotation.y = ry + time * 0.2;
      networkGroup.rotation.x = rx + Math.sin(time * 0.3) * 0.08;

      coreWire.rotation.y = -time * 0.3;
      coreWire.rotation.x = time * 0.15;
      innerCore.rotation.y = time * 0.5;

      ring1.rotation.z = time * 0.25;
      ring2.rotation.z = -time * 0.2;

      // Update orbiting nodes and connection lines
      let lineIdx = 0;
      nodes.forEach((nd, i) => {
        const curAngle = nd.angle + time * nd.speed;
        const x = Math.cos(curAngle) * nd.r;
        const z = Math.sin(curAngle) * nd.r;
        const y = Math.sin(curAngle * 2 + nd.incX) * (nd.r * 0.35);

        nodeVec.set(x, y, z);
        dummyM4.makeScale(1, 1, 1).setPosition(nodeVec);
        nodeInst.setMatrixAt(i, dummyM4);

        // Line from core (0,0,0) to node
        linePositions[lineIdx++] = 0;
        linePositions[lineIdx++] = 0;
        linePositions[lineIdx++] = 0;
        linePositions[lineIdx++] = x;
        linePositions[lineIdx++] = y;
        linePositions[lineIdx++] = z;
      });

      nodeInst.instanceMatrix.needsUpdate = true;
      lineGeo.attributes.position.needsUpdate = true;

      // Particles float slowly
      particles.rotation.y = time * 0.04;
      particles.rotation.x = time * 0.02;

      camera.position.x = mouse.x * 0.25;
      camera.position.y = mouse.y * 0.2;
      camera.lookAt(0, 0, 0);
    },
    dispose: () => disposeScene(scene),
  };
}
