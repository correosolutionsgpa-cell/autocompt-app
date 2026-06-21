/**
 * useSofiState — SOFI AI Entity State Hook
 *
 * Controls the emissive pulse speed and intensity of SOFI's:
 *   • Chest Core breathing animation
 *   • Seam line glow
 *   • Chassis micro-LEDs
 *
 * States:
 *   idle        → slow breathing pulse (0.8 Hz)
 *   processing  → accelerated calculation-frequency pulse (3.0 Hz)
 */

import { useRef, useState, useCallback, useEffect } from "react";

export interface SofiStateConfig {
  /** True when Scanner IA / backend document parsing is active */
  isProcessing?: boolean;
}

export interface SofiStateResult {
  /** Current pulse frequency in Hz */
  pulseHz: number;
  /** Emissive intensity multiplier [0.4 – 2.0] */
  emissiveIntensity: number;
  /** True during active document parsing */
  isProcessing: boolean;
  /** Manual override: trigger processing state externally */
  triggerProcessing: () => void;
  /** Manual override: return to idle state */
  triggerIdle: () => void;
  /** Current elapsed time (seconds) — drives sin() pulse in shader */
  elapsedRef: React.MutableRefObject<number>;
}

const IDLE_HZ = 0.8;
const PROCESSING_HZ = 3.0;
const IDLE_INTENSITY = 0.6;
const PROCESSING_INTENSITY = 1.8;

export function useSofiState({ isProcessing: externalProcessing = false }: SofiStateConfig = {}): SofiStateResult {
  const [isProcessing, setIsProcessing] = useState(externalProcessing);
  const elapsedRef = useRef(0);

  // Sync with external prop changes
  useEffect(() => {
    setIsProcessing(externalProcessing);
  }, [externalProcessing]);

  const triggerProcessing = useCallback(() => setIsProcessing(true), []);
  const triggerIdle = useCallback(() => setIsProcessing(false), []);

  const pulseHz = isProcessing ? PROCESSING_HZ : IDLE_HZ;
  const emissiveIntensity = isProcessing ? PROCESSING_INTENSITY : IDLE_INTENSITY;

  return {
    pulseHz,
    emissiveIntensity,
    isProcessing,
    triggerProcessing,
    triggerIdle,
    elapsedRef,
  };
}
