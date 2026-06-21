/**
 * useMouseTracking — SOFI Head Mouse Tracking Hook
 *
 * Converts raw screen mouse coordinates into smooth, lerp-interpolated
 * head rotation angles clamped to ±15 degrees (±0.2618 radians).
 *
 * Architecture:
 *   • Listens to document mousemove event
 *   • Normalizes mouse to [-1, 1] range relative to viewport center
 *   • Applies ±15° clamp (anatomical safety limit per .cursorrules spec)
 *   • Stores raw target in ref — lerp is applied per-frame in useFrame()
 */

import { useEffect, useRef } from "react";

/** Maximum rotation in radians = 15° */
const MAX_ANGLE_RAD = (15 * Math.PI) / 180; // 0.2618 rad
/** Lerp factor per frame (at 60fps gives ~3s to reach target) */
export const LERP_FACTOR = 0.04;

export interface MouseTarget {
  x: number; // target horizontal rotation (radians), clamped ±MAX_ANGLE_RAD
  y: number; // target vertical rotation (radians), clamped ±MAX_ANGLE_RAD
}

export interface MouseTrackingResult {
  /** Raw target rotation angles — consume in useFrame() with lerp */
  targetRef: React.MutableRefObject<MouseTarget>;
  /** Current lerped angles — updated in useFrame by consumer */
  currentRef: React.MutableRefObject<MouseTarget>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useMouseTracking(): MouseTrackingResult {
  const targetRef = useRef<MouseTarget>({ x: 0, y: 0 });
  const currentRef = useRef<MouseTarget>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position to [-1, 1] relative to viewport center
      const nx = (e.clientX / window.innerWidth) * 2 - 1;  // -1 (left) to +1 (right)
      const ny = (e.clientY / window.innerHeight) * 2 - 1; // -1 (top) to +1 (bottom)

      // Map to rotation angles and clamp to ±15°
      // Head turns RIGHT when mouse is RIGHT → positive X → positive Y rotation in Three.js
      // Head turns DOWN when mouse is DOWN → positive Y → negative X rotation in Three.js
      targetRef.current.x = clamp(-ny * MAX_ANGLE_RAD, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);
      targetRef.current.y = clamp(nx * MAX_ANGLE_RAD, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);
    };

    // Touch support for mobile
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const nx = (touch.clientX / window.innerWidth) * 2 - 1;
      const ny = (touch.clientY / window.innerHeight) * 2 - 1;
      targetRef.current.x = clamp(-ny * MAX_ANGLE_RAD, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);
      targetRef.current.y = clamp(nx * MAX_ANGLE_RAD, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return { targetRef, currentRef };
}
