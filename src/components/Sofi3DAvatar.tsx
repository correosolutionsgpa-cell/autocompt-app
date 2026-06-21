/**
 * Sofi3DAvatar — Hyperrealistic 3D SOFI Entity Container
 *
 * Drop-in replacement for SofiAvatarSVG with identical prop API.
 * Wraps SofiScene (WebGL Canvas) in a sized div with the same
 * proportional relationship as the original SVG (height = size × 1.25).
 *
 * Props:
 *   size          – width in px (default 160); height = size × 1.5
 *   className     – extra CSS classes on the wrapper div
 *   isProcessing  – true when Scanner IA / document parsing is active
 *                   (accelerates chest core emissive pulse)
 *   onClick       – optional click handler
 *
 * Architecture notes:
 *   • SofiAvatarSVG.tsx is PRESERVED (Golden Rule: Zero Deletion)
 *   • This component renders a WebGL Canvas via React Three Fiber
 *   • Falls back gracefully if WebGL is unavailable (future enhancement)
 */

import React from "react";
import { SofiScene } from "./sofi3d/SofiScene";

export interface Sofi3DAvatarProps {
  /** Width in pixels; height = size × 1.5 */
  size?: number;
  /** Extra CSS classes on the wrapper div */
  className?: string;
  /** True when Scanner IA / document parsing is active */
  isProcessing?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Enable debug orbit controls (dev only) */
  debugOrbit?: boolean;
}

export function Sofi3DAvatar({
  size = 160,
  className = "",
  isProcessing = false,
  onClick,
  debugOrbit = false,
}: Sofi3DAvatarProps) {
  const height = Math.round(size * 1.5);

  return (
    <div
      className={`relative select-none ${className}`}
      style={{
        width: size,
        height,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label="SOFI – AutoCompt AI Assistant (3D)"
    >
      <SofiScene isProcessing={isProcessing} debugOrbit={debugOrbit} />
    </div>
  );
}

export default Sofi3DAvatar;
