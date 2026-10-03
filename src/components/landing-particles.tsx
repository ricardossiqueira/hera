import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const fragmentShader = `
  varying float vAlpha;
  varying float vLight;
  uniform vec3 uColor;
  void main() {
    float radius = length(gl_PointCoord - 0.5);
    if (radius > 0.5 || vAlpha < 0.01) discard;
    float dot = 1.0 - smoothstep(0.40, 0.5, radius);
    gl_FragColor = vec4(uColor * vLight, dot * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function pointMaterial(model: boolean) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: model ? NormalBlending : AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: model ? 0.9 : 0.3 },
      uColor: { value: new Color(model ? "#e2e5dc" : "#adbaa7") },
    },
    vertexShader: model
      ? `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uOpacity;
      varying float vAlpha;
      varying float vLight;
      void main() {
        // Keep the cloud on its depth surface; float the whole group instead.
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        float facing = dot(n, normalize(-viewPosition.xyz));
        float key = pow(max(dot(n, normalize(vec3(-0.8, 0.65, 0.9))), 0.0), 1.35);
        float fill = max(dot(n, normalize(vec3(0.9, 0.2, 0.5))), 0.0);
        vLight = 0.055 + 0.88 * key + 0.07 * fill;
        // Readable face dots, quieter shoulders; light controls size as well
        // as luminance, so shadows stay dark without turning into a glow.
        float face = smoothstep(1.1, 2.15, position.y);
        float pointSize = mix(1.05, 1.7, face) * mix(0.85, 1.15, key);
        vAlpha = smoothstep(0.0, 0.12, facing) * uOpacity;
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(pointSize * 9.0 / -viewPosition.z, 1.0, 2.5) * uPixelRatio;
      }
    `
      : `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uOpacity;
      varying float vAlpha;
      varying float vLight;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.12 + position.z * 2.0) * 0.22;
        p.y = mod(position.y + uTime * (0.025 + fract(position.x) * 0.015) + 6.0, 12.0) - 6.0;
        vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
        vAlpha = uOpacity * (0.45 + 0.55 * sin(position.x * 23.0 + position.y * 17.0) * sin(position.x * 23.0 + position.y * 17.0));
        vLight = 1.0;
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(17.0 / -viewPosition.z, 1.2, 3.0) * uPixelRatio;
      }
    `,
    fragmentShader,
  });
}

export default function LandingParticles() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = container.current;
    if (!host || typeof WebGL2RenderingContext === "undefined") return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
    } catch {
      // The CSS background remains usable when WebGL is unavailable.
      return;
    }
    host.appendChild(renderer.domElement);
    renderer.setClearColor(0x000000, 0);
    const scene = new Scene();
    const camera = new PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.z = 10;
    const statue = new Group();
    scene.add(statue);
    const modelMaterial = pointMaterial(true);
    // Writes depth only, never a solid silhouette or color. The polygon bias
    // lets points on the surface pass without z-fighting against the triangles.
    const occlusionMaterial = new MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const dustMaterial = pointMaterial(false);
    const dustGeometry = new BufferGeometry();
    const positions = new Float32Array(650 * 3);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 24;
      positions[i + 1] = (Math.random() - 0.5) * 12;
      positions[i + 2] = (Math.random() - 0.5) * 7;
    }
    dustGeometry.setAttribute("position", new BufferAttribute(positions, 3));
    const dust = new Points(dustGeometry, dustMaterial);
    scene.add(dust);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    let disposed = false;
    let contextLost = false;
    let frame = 0;
    let modelGeometry: BufferGeometry | undefined;
    let occlusionGeometry: BufferGeometry | undefined;
    let pointerX = 0;
    let pointerY = 0;
    let elapsed = 0;
    let previousTime = 0;
    let mobile = false;

    const render = () => {
      if (disposed || contextLost) return;
      const movement = reducedMotion.matches ? 0 : elapsed;
      modelMaterial.uniforms.uTime.value = movement;
      dustMaterial.uniforms.uTime.value = movement;
      statue.rotation.y =
        1.15 +
        (reducedMotion.matches
          ? 0
          : Math.sin(movement * 0.16) * 0.045 + pointerX * 0.025);
      statue.rotation.x = reducedMotion.matches ? 0 : pointerY * 0.025;
      statue.position.y =
        (mobile ? -0.25 : 0.05) + Math.sin(movement * 0.4) * 0.07;
      const scrollFade = Math.max(
        0.32,
        1 - window.scrollY / (window.innerHeight * 1.3),
      );
      modelMaterial.uniforms.uOpacity.value =
        (mobile ? 0.2 : 0.95) * scrollFade;
      renderer.render(scene, camera);
    };
    const animate = (time: number) => {
      if (previousTime) elapsed += Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      render();
      frame = requestAnimationFrame(animate);
    };
    const syncMotion = () => {
      cancelAnimationFrame(frame);
      previousTime = 0;
      if (
        !disposed &&
        !contextLost &&
        !document.hidden &&
        !reducedMotion.matches
      ) {
        frame = requestAnimationFrame(animate);
      } else if (!document.hidden) render();
    };
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      mobile = width < 700;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const halfWidth =
        Math.tan((camera.fov * Math.PI) / 360) *
        camera.position.z *
        camera.aspect;
      statue.position.x = halfWidth * (mobile ? 0.65 : 0.66);
      statue.scale.setScalar(mobile ? 2.1 : 2.65);
      if (modelGeometry) {
        const count = modelGeometry.getAttribute("position").count;
        modelGeometry.setDrawRange(0, mobile ? Math.floor(count * 0.4) : count);
      }
      dustGeometry.setDrawRange(0, mobile ? 250 : 650);
      modelMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      dustMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      render();
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reducedMotion.matches) return;
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
    };
    const onScroll = () => {
      if (reducedMotion.matches) render();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
    };
    const onContextRestored = () => {
      contextLost = false;
      resize();
      syncMotion();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", syncMotion);
    reducedMotion.addEventListener("change", syncMotion);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      onContextRestored,
    );
    resize();
    syncMotion();

    void fetch(`${import.meta.env.BASE_URL}models/hera-points.glb`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Hera model: HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => new GLTFLoader().parseAsync(buffer, ""))
      .then((gltf) => {
        gltf.scene.traverse((object) => {
          if (!(object instanceof Points) && !(object instanceof Mesh)) return;
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            material.dispose();
          if (disposed) {
            object.geometry.dispose();
            return;
          }
          if (object instanceof Mesh) {
            occlusionGeometry = object.geometry;
            const occluder = new Mesh(occlusionGeometry, occlusionMaterial);
            occluder.position.y = -2;
            occluder.renderOrder = -1;
            statue.add(occluder);
            return;
          }
          modelGeometry = object.geometry;
          const pointCloud = new Points(modelGeometry, modelMaterial);
          // The normalized statue spans y=-3..3; y=2 centers its upper third.
          pointCloud.position.y = -2;
          statue.add(pointCloud);
        });
        if (!disposed) {
          host.dataset.model = "ready";
          resize();
        }
      })
      .catch(() => {
        // A missing model must never prevent reading or entering the app.
        if (!disposed) host.dataset.model = "unavailable";
      });

    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", syncMotion);
      reducedMotion.removeEventListener("change", syncMotion);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost,
      );
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        onContextRestored,
      );
      modelGeometry?.dispose();
      occlusionGeometry?.dispose();
      dustGeometry.dispose();
      modelMaterial.dispose();
      occlusionMaterial.dispose();
      dustMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={container} className="landing-particles" aria-hidden="true" />
  );
}
