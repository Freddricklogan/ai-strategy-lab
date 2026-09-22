export type ThemeName = 'signal' | 'graphite' | 'ember' | 'plum' | 'forest' | 'midnight';
export interface KpiSpec { label: string; compute: () => string | number; tone?: 'ok' | 'warn' | 'danger' | 'accent' | 'muted' }
export interface TourStep { selector: string; title: string; body: string; action?: () => void | Promise<void> }
export interface BadgeSpec { label: string; tone?: 'accent' | 'plain' | 'ok' | 'muted'; dot?: boolean }
export interface ShellConfig {
  title: string; tagline: string; repo: string; pagesUrl?: string;
  badges?: BadgeSpec[]; kpis?: KpiSpec[]; tour?: TourStep[]; mainSelector?: string;
  theme?: ThemeName; accent?: 'primary' | 'secondary';
}
export interface ShellApi {
  header: HTMLElement; kpiStrip: HTMLElement | null; footer: HTMLElement;
  refreshKpis(): void; startTour(): void; stopTour(): void; destroy(): void;
}
export interface ShellTokens {
  bg: string; panel: string; panel2: string; border: string; text: string; muted: string;
  accent: string; accent2: string; ok: string; warn: string; danger: string; onAccent: string; series: string[];
}
export const THEMES: readonly ThemeName[];
export function applyTheme(theme: ThemeName, accent?: 'primary' | 'secondary'): void;
export function tokens(): ShellTokens;
export function onSchemeChange(callback: (t: ShellTokens) => void): () => void;
export function mountExecShell(config: ShellConfig): ShellApi;
export default mountExecShell;
