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
    // Wide falloff so each dot reads as a soft point of light, not a hard disc.
    float dot = 1.0 - smoothstep(0.12, 0.5, radius);
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
        // Keep the cloud aligned with its depth surface as the group rotates.
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        float facing = dot(n, normalize(-viewPosition.xyz));
        float key = pow(max(dot(n, normalize(vec3(-0.8, 0.65, 0.9))), 0.0), 1.35);
        float fill = max(dot(n, normalize(vec3(0.9, 0.2, 0.5))), 0.0);
        vLight = 0.055 + 0.88 * key + 0.07 * fill;
        // Readable face dots, quieter shoulders; light controls size as well
        // as luminance, so shadows stay dark without turning into a glow.
        float face = smoothstep(1.1, 2.15, position.y);
        // Per-point size variation: a stable hash spreads dots from small up to
        // the current maximum, so the cloud reads as natural grain rather than a
        // uniform stipple.
        float hash = fract(sin(dot(position.xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float sizeJitter = mix(0.4, 1.0, hash);
        float pointSize = mix(0.9, 1.4, face) * mix(0.85, 1.15, key) * sizeJitter;
        vAlpha = smoothstep(0.0, 0.12, facing) * uOpacity;
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(pointSize * 9.0 / -viewPosition.z, 0.6, 2.1) * uPixelRatio;
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
        gl_PointSize = clamp(19.5 / -viewPosition.z, 1.4, 3.0) * uPixelRatio;
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
    const positions = new Float32Array(1500 * 3);
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
    // Base yaw. The bust's model default faces away, so a half turn (+π) brings
    // the front toward the camera for the three-quarter view.
    const baseRotation = 1.15 + Math.PI * 1.2;
    let targetRotation = baseRotation;
    let rotation = baseRotation;
    let elapsed = 0;
    let previousTime = 0;
    let mobile = false;
    let modelReady = false;
    let modelReveal = 0;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let parallaxX = 0;
    let parallaxY = 0;

    const render = () => {
      if (disposed || contextLost) return;
      const movement = reducedMotion.matches ? 0 : elapsed;
      modelMaterial.uniforms.uTime.value = movement;
      dustMaterial.uniforms.uTime.value = movement;
      const baseY = mobile ? -0.25 : 1.3;
      if (reducedMotion.matches) {
        statue.rotation.y = baseRotation;
        statue.rotation.x = 0;
        statue.position.y = baseY;
      } else {
        // Idle sway and float keep the figure gently in motion even with no
        // scroll, layered on top of the scroll-driven rotation. Parallax adds
        // a soft response to the pointer. All amplitudes are small on purpose.
        statue.rotation.y =
          rotation + Math.sin(movement * 0.52) * 0.05 + parallaxX;
        statue.rotation.x = Math.sin(movement * 0.35) * 0.02 + parallaxY;
        statue.position.y = baseY + Math.sin(movement * 0.6) * 0.04;
      }
      // Steady visibility: the model no longer dims and brightens with scroll.
      // Ease only the one-time entrance (smoothstep) so points fade in on load
      // instead of popping.
      const r = reducedMotion.matches ? 1 : modelReveal;
      const reveal = r * r * (3 - 2 * r);
      modelMaterial.uniforms.uOpacity.value = (mobile ? 0.2 : 0.95) * reveal;
      renderer.render(scene, camera);
    };
    const animate = (time: number) => {
      if (disposed || contextLost || document.hidden || reducedMotion.matches) {
        previousTime = 0;
        if (!document.hidden) render();
        return;
      }
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
      elapsed += delta;
      rotation += (targetRotation - rotation) * (1 - Math.exp(-8 * delta));
      if (modelReady && modelReveal < 1) {
        modelReveal = Math.min(1, modelReveal + delta / 0.9);
      }
      // Pointer parallax is desktop-only; the target collapses to 0 on mobile
      // so the offset eases back out smoothly instead of snapping.
      const reach = mobile ? 0 : 1;
      parallaxX += (pointerTargetX * reach - parallaxX) * (1 - Math.exp(-6 * delta));
      parallaxY += (pointerTargetY * reach - parallaxY) * (1 - Math.exp(-6 * delta));
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
    const updateScroll = () => {
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
      targetRotation = baseRotation + progress * 0.24;
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
      // Shifted left by 10% of the viewport width (full width = 2 * halfWidth).
      statue.position.x = halfWidth * (mobile ? 0.65 : 0.66);
      statue.scale.setScalar((mobile ? 2.1 : 2.65) * 0.35);
      if (modelGeometry) {
        const count = modelGeometry.getAttribute("position").count;
        // The offline sample is shuffled, so a prefix remains evenly distributed.
        modelGeometry.setDrawRange(0, Math.floor(count * (mobile ? 0.32 : 0.8)));
      }
      dustGeometry.setDrawRange(0, mobile ? 600 : 1500);
      modelMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      dustMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      updateScroll();
      render();
    };
    const onScroll = () => {
      updateScroll();
      if (reducedMotion.matches) render();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches || mobile) return;
      // ±0.04 rad of lean toward the pointer; the loop eases toward this.
      pointerTargetX = ((event.clientX / window.innerWidth) - 0.5) * 0.08;
      pointerTargetY = ((event.clientY / window.innerHeight) - 0.5) * 0.08;
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
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", syncMotion);
    reducedMotion.addEventListener("change", syncMotion);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      onContextRestored,
    );
    resize();
    syncMotion();

    void fetch(`${import.meta.env.BASE_URL}models/female-bust-points.glb`, {
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
          modelReady = true;
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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
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
