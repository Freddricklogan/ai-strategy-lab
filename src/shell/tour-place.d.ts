export interface Rect { top: number; bottom: number; left: number }
export function placeTourCard(p: { rect: Rect; vw: number; vh: number; cw: number; ch: number; margin?: number; gap?: number }): { left: number; top: number };
export function centreTourCard(p: { vw: number; vh: number; cw: number; ch: number; margin?: number }): { left: number; top: number };
