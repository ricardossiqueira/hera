// Offline conversion: the browser downloads only the sampled point cloud.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Box3, BufferAttribute, MathUtils, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const source = new URL("../assets/source/hera.glb", import.meta.url);
const destination = new URL(
  "../public/models/hera-points.glb",
  import.meta.url,
);
const input = await readFile(source);
if (input.readUInt32LE(0) !== 0x46546c67 || input.readUInt32LE(4) !== 2) {
  throw new Error("Expected a glTF 2.0 binary file.");
}
const jsonLength = input.readUInt32LE(12);
const document = JSON.parse(input.subarray(20, 20 + jsonLength).toString());
const binOffset = 20 + jsonLength;
const binary = input.subarray(
  binOffset + 8,
  binOffset + 8 + input.readUInt32LE(binOffset),
);

function encodeGlb(json, data) {
  const text = Buffer.from(JSON.stringify(json));
  const jsonSize = Math.ceil(text.length / 4) * 4;
  const binSize = Math.ceil(data.length / 4) * 4;
  const output = Buffer.alloc(28 + jsonSize + binSize);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonSize, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  output.fill(0x20, 20, 20 + jsonSize);
  text.copy(output, 20);
  output.writeUInt32LE(binSize, 20 + jsonSize);
  output.writeUInt32LE(0x004e4942, 24 + jsonSize);
  data.copy(output, 28 + jsonSize);
  return output;
}

// Textures aren't needed for surface sampling. Skip image decoding in Node.
for (const mesh of document.meshes) {
  for (const primitive of mesh.primitives) delete primitive.material;
}
delete document.materials;
delete document.textures;
delete document.images;
delete document.samplers;
const geometryOnly = encodeGlb(document, binary);
const gltf = await new GLTFLoader().parseAsync(
  geometryOnly.buffer.slice(
    geometryOnly.byteOffset,
    geometryOnly.byteOffset + geometryOnly.byteLength,
  ),
  "",
);
gltf.scene.updateMatrixWorld(true);
const geometries = [];
gltf.scene.traverse((object) => {
  if (!object.isMesh) return;
  const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
  for (const attribute of Object.keys(geometry.attributes)) {
    if (attribute !== "position" && attribute !== "normal")
      geometry.deleteAttribute(attribute);
  }
  geometries.push(geometry);
});
const merged = mergeGeometries(geometries);
if (!merged) throw new Error("Could not merge the Hera surface.");
merged.computeBoundingBox();
const bounds = merged.boundingBox;
const center = bounds.getCenter(new Vector3());
const scale = 6 / bounds.getSize(new Vector3()).y;
merged.translate(-center.x, -center.y, -center.z).scale(scale, scale, scale);

// Concentrate surface samples around the upper third shown by the camera.
// Keep a sparse lower silhouette instead of introducing a hard crop boundary.
const surfacePositions = merged.getAttribute("position");
const density = new Float32Array(surfacePositions.count);
for (let i = 0; i < density.length; i++) {
  density[i] =
    0.06 + 0.94 * MathUtils.smoothstep(surfacePositions.getY(i), 0.5, 1.5);
}
merged.setAttribute("density", new BufferAttribute(density, 1));
// Reproducible samples independent of the mesh's vertex density.
let seed = 42;
const random = () =>
  (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
const sampler = new MeshSurfaceSampler(new Mesh(merged))
  .setWeightAttribute("density")
  .setRandomGenerator(random)
  .build();
const count = 160000;
const positions = new Float32Array(count * 3);
const normals = new Float32Array(count * 3);
const point = new Vector3();
const normal = new Vector3();
const sampledBounds = new Box3();
// Minimum spacing avoids random clumps that read as grain instead of dots.
const spacing = 0.0065;
const cells = new Map();
let attempts = 0;
for (let i = 0; i < count; ) {
  if (++attempts > count * 40)
    throw new Error(
      "Could not fill the spaced point cloud; keep the previous asset.",
    );
  sampler.sample(point, normal);
  const cx = Math.floor(point.x / spacing);
  const cy = Math.floor(point.y / spacing);
  const cz = Math.floor(point.z / spacing);
  let crowded = false;
  for (let x = -1; x <= 1 && !crowded; x++) {
    for (let y = -1; y <= 1 && !crowded; y++) {
      for (let z = -1; z <= 1 && !crowded; z++) {
        for (const neighbor of cells.get(`${cx + x},${cy + y},${cz + z}`) ??
          []) {
          const dx = point.x - positions[neighbor * 3];
          const dy = point.y - positions[neighbor * 3 + 1];
          const dz = point.z - positions[neighbor * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < spacing * spacing) {
            crowded = true;
            break;
          }
        }
      }
    }
  }
  if (crowded) continue;
  point.toArray(positions, i * 3);
  normal.normalize().toArray(normals, i * 3);
  sampledBounds.expandByPoint(point);
  const key = `${cx},${cy},${cz}`;
  const bucket = cells.get(key) ?? [];
  bucket.push(i);
  cells.set(key, bucket);
  i++;
}
// Shuffle deterministically: the mobile prefix retains even surface coverage.
for (let i = count - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  for (let axis = 0; axis < 3; axis++) {
    const a = i * 3 + axis;
    const b = j * 3 + axis;
    [positions[a], positions[b]] = [positions[b], positions[a]];
    [normals[a], normals[b]] = [normals[b], normals[a]];
  }
}
// The upper surface is exported only as an invisible depth occluder. Exact
// triangles keep points on the back of the head from shining through the face.
const sourceIndices = merged.getIndex();
const remap = new Map();
const occlusionPositions = [];
const occlusionIndices = [];
const occlusionBounds = new Box3();
for (let i = 0; i < sourceIndices.count; i += 3) {
  const triangle = [
    sourceIndices.getX(i),
    sourceIndices.getX(i + 1),
    sourceIndices.getX(i + 2),
  ];
  if (triangle.every((index) => surfacePositions.getY(index) < 0.25)) continue;
  for (const index of triangle) {
    if (!remap.has(index)) {
      remap.set(index, occlusionPositions.length / 3);
      point.fromBufferAttribute(surfacePositions, index);
      occlusionPositions.push(point.x, point.y, point.z);
      occlusionBounds.expandByPoint(point);
    }
    occlusionIndices.push(remap.get(index));
  }
}
const surfaceVertices = new Float32Array(occlusionPositions);
const surfaceTriangles = new Uint32Array(occlusionIndices);
const surfaceOffset = positions.byteLength + normals.byteLength;
const data = Buffer.concat([
  Buffer.from(positions.buffer),
  Buffer.from(normals.buffer),
  Buffer.from(surfaceVertices.buffer),
  Buffer.from(surfaceTriangles.buffer),
]);
const output = encodeGlb(
  {
    asset: {
      version: "2.0",
      generator: "Hera surface point sampler",
      extras: {
        ...document.asset.extras,
        modification: `Surface sampled into ${count.toLocaleString("en-US")} points, concentrated on the upper third; upper surface retained for depth occlusion only; original textures removed.`,
      },
    },
    scene: 0,
    scenes: [{ nodes: [0, 1] }],
    nodes: [
      { mesh: 0, name: "Hera points" },
      { mesh: 1, name: "Hera depth surface" },
    ],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, mode: 0 }] },
      { primitives: [{ attributes: { POSITION: 2 }, indices: 3, mode: 4 }] },
    ],
    buffers: [{ byteLength: data.length }],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: positions.byteLength,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: positions.byteLength,
        byteLength: normals.byteLength,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: surfaceOffset,
        byteLength: surfaceVertices.byteLength,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: surfaceOffset + surfaceVertices.byteLength,
        byteLength: surfaceTriangles.byteLength,
        target: 34963,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count,
        type: "VEC3",
        min: sampledBounds.min.toArray(),
        max: sampledBounds.max.toArray(),
      },
      { bufferView: 1, componentType: 5126, count, type: "VEC3" },
      {
        bufferView: 2,
        componentType: 5126,
        count: surfaceVertices.length / 3,
        type: "VEC3",
        min: occlusionBounds.min.toArray(),
        max: occlusionBounds.max.toArray(),
      },
      {
        bufferView: 3,
        componentType: 5125,
        count: surfaceTriangles.length,
        type: "SCALAR",
      },
    ],
  },
  data,
);
await mkdir(new URL("../public/models/", import.meta.url), { recursive: true });
await writeFile(destination, output);
for (const geometry of geometries) geometry.dispose();
merged.dispose();
gltf.scene.traverse((object) => {
  if (!object.isMesh) return;
  object.geometry.dispose();
  for (const material of Array.isArray(object.material)
    ? object.material
    : [object.material])
    material.dispose();
});
console.log(
  `Hera: ${count.toLocaleString("en-US")} points, ${(output.length / 1024).toFixed(0)} KiB (original ${(input.length / 1024 / 1024).toFixed(1)} MiB).`,
);
