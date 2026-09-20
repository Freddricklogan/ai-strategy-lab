export interface KpiSpec { label: string; compute: () => string | number; tone?: 'ok' | 'warn' | 'danger' | 'accent' | 'muted' }
export interface TourStep { selector: string; title: string; body: string; action?: () => void | Promise<void> }
export interface BadgeSpec { label: string; tone?: 'accent' | 'plain' | 'ok' | 'muted'; dot?: boolean }
export interface ShellConfig {
  title: string; tagline: string; repo: string; pagesUrl?: string;
  badges?: BadgeSpec[]; kpis?: KpiSpec[]; tour?: TourStep[]; mainSelector?: string;
}
export interface ShellApi {
  header: HTMLElement; kpiStrip: HTMLElement | null; footer: HTMLElement;
  refreshKpis(): void; startTour(): void; stopTour(): void; destroy(): void;
}
export function mountExecShell(config: ShellConfig): ShellApi;
export default mountExecShell;
