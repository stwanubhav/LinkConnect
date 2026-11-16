import * as THREE from "three";
import { disposeScene, type Chapter } from "./types";

export function createContact(): Chapter {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#050811");
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 5);

  // Floating ambient cyber dust particles
  const count = 60;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    pos[i] = (Math.random() - 0.5) * 8;
    pos[i + 1] = (Math.random() - 0.5) * 6;
    pos[i + 2] = (Math.random() - 0.5) * 4;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.035,
    color: "#a855f7",
    transparent: true,
    opacity: 0.55,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  return {
    scene,
    camera,
    update(lp, time) {
      points.rotation.y = time * 0.04;
      points.rotation.x = time * 0.02;
    },
    dispose: () => disposeScene(scene),
  };
}
