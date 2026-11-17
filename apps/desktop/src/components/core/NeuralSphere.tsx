
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import * as THREE from "three";

export type SphereState =
  | "ambient"
  | "listening"
  | "thinking"
  | "speaking";

interface SphereProps {
  state: SphereState;
}

const CONFIG = {
  ambient: {
    color: "#00D9FF",
    speed: 0.10,
    pulse: 0.018,
    intensity: 0.7,
  },
  listening: {
    color: "#62F5FF",
    speed: 0.28,
    pulse: 0.065,
    intensity: 1.1,
  },
  thinking: {
    color: "#38A9FF",
    speed: 0.55,
    pulse: 0.045,
    intensity: 1.3,
  },
  speaking: {
    color: "#B8F5FF",
    speed: 0.35,
    pulse: 0.075,
    intensity: 1.5,
  },
};

function createNeuralGeometry() {
  const count = 110;
  const radius = 1.05;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  const nodes: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;

    nodes.push(
      new THREE.Vector3(
        Math.cos(theta) * r * radius,
        y * radius,
        Math.sin(theta) * r * radius
      )
    );
  }

  const nodePositions: number[] = [];
  const linePositions: number[] = [];

  nodes.forEach((node) => {
    nodePositions.push(node.x, node.y, node.z);
  });

  for (let i = 0; i < count; i++) {
    const nearby = nodes
      .map((node, index) => ({
        index,
        distance: nodes[i].distanceTo(node),
      }))
      .filter((item) => item.index > i && item.distance < 0.36)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);

    for (const item of nearby) {
      const a = nodes[i];
      const b = nodes[item.index];

      linePositions.push(
        a.x, a.y, a.z,
        b.x, b.y, b.z
      );
    }
  }

  return {
    nodes: new Float32Array(nodePositions),
    lines: new Float32Array(linePositions),
  };
}

function createParticles() {
  const count = 650;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 1.35 + Math.random() * 0.5;

    positions[i * 3] =
      radius * Math.sin(phi) * Math.cos(theta);

    positions[i * 3 + 1] =
      radius * Math.sin(phi) * Math.sin(theta);

    positions[i * 3 + 2] =
      radius * Math.cos(phi);
  }

  return positions;
}

function NeuralCore({ state }: SphereProps) {
  const root = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Group>(null);

  const core = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);

  const ringOne = useRef<THREE.Mesh>(null);
  const ringTwo = useRef<THREE.Mesh>(null);
  const ringThree = useRef<THREE.Mesh>(null);

  const particleField = useRef<THREE.Points>(null);

  const neural = useMemo(createNeuralGeometry, []);
  const particles = useMemo(createParticles, []);

  const config = CONFIG[state];

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    if (root.current) {
      root.current.rotation.y += delta * config.speed;
      root.current.rotation.x = Math.sin(t * 0.2) * 0.04;
    }

    if (shell.current) {
      shell.current.rotation.y -= delta * config.speed * 0.45;
      shell.current.rotation.z = Math.sin(t * 0.15) * 0.025;
    }

    const pulse =
      1 + Math.sin(t * (state === "speaking" ? 7 : 2)) * config.pulse;

    if (core.current) {
      core.current.scale.setScalar(pulse);
    }

    if (glow.current) {
      glow.current.scale.setScalar(pulse);
    }

    if (ringOne.current) {
      ringOne.current.rotation.z += delta * 0.13;
    }

    if (ringTwo.current) {
      ringTwo.current.rotation.y += delta * 0.09;
    }

    if (ringThree.current) {
      ringThree.current.rotation.x += delta * 0.07;
    }

    if (particleField.current) {
      particleField.current.rotation.y += delta * 0.025;
    }
  });

  return (
    <group ref={root}>

      {/* Small luminous central energy source */}
      <mesh ref={core}>
        <sphereGeometry args={[0.43, 48, 48]} />
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={0.20}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Soft energy halo */}
      <mesh ref={glow} scale={1.5}>
        <sphereGeometry args={[0.43, 32, 32]} />
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={0.055}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Faint inner energy points */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                -0.2, 0.1, 0.2,
                0.15, -0.15, 0.2,
                0.1, 0.2, -0.1,
                -0.1, -0.2, -0.1,
                0.2, 0.05, -0.15,
              ]),
              3
            ]}
            count={5}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#B8F5FF"
          size={0.045}
          transparent
          opacity={0.8}
        />
      </points>

      {/* Delicate neural shell */}
      <group ref={shell}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[neural.lines, 3]}
              count={neural.lines.length / 3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={config.color}
            transparent
            opacity={0.24}
            depthWrite={false}
          />
        </lineSegments>

        {/* Neural nodes */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[neural.nodes, 3]}
              count={neural.nodes.length / 3}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#B8F5FF"
            size={0.032}
            transparent
            opacity={0.85}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
      </group>

      {/* Very subtle outer contour */}
      <mesh scale={1.13}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#38A9FF"
          wireframe
          transparent
          opacity={0.025}
          depthWrite={false}
        />
      </mesh>

      {/* Surrounding particles */}
      <points ref={particleField}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles, 3]}
            count={particles.length / 3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={config.color}
          size={0.018}
          transparent
          opacity={0.55}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Three orbital rings with distinct orientations */}
      <mesh ref={ringOne} rotation={[1.05, 0.15, 0]}>
        <torusGeometry args={[1.42, 0.006, 8, 180]} />
        <meshBasicMaterial
          color="#00D9FF"
          transparent
          opacity={0.72}
        />
      </mesh>

      <mesh ref={ringTwo} rotation={[0.35, 0.9, 0]}>
        <torusGeometry args={[1.62, 0.005, 8, 180]} />
        <meshBasicMaterial
          color="#38A9FF"
          transparent
          opacity={0.48}
        />
      </mesh>

      <mesh ref={ringThree} rotation={[0.85, 0.4, 0.7]}>
        <torusGeometry args={[1.78, 0.004, 8, 180]} />
        <meshBasicMaterial
          color="#B8F5FF"
          transparent
          opacity={0.32}
        />
      </mesh>

    </group>
  );
}

export default function NeuralSphere({ state }: SphereProps) {
  return (
    <div className="sphere-canvas">
      <Canvas
        camera={{ position: [0, 0, 5.3], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <ambientLight intensity={0.35} />

        <pointLight
          position={[3, 3, 4]}
          intensity={1.2}
          color="#00D9FF"
        />

        <pointLight
          position={[-3, -2, -3]}
          intensity={0.6}
          color="#2563EB"
        />

        <Stars
          radius={35}
          depth={25}
          count={180}
          factor={1.5}
          fade
          speed={0.12}
        />

        <Float
          speed={0.7}
          rotationIntensity={0.035}
          floatIntensity={0.08}
        >
          <NeuralCore state={state} />
        </Float>
      </Canvas>
    </div>
  );
}
