import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { generateCells, type Cell } from '../data/generator';
import { aggregate, dailySeries, metricsForAggregation, type Aggregation, type DailyPoint, type Filters, type KpiKey, type Metrics } from '../data/engine';
import { DATA_DAYS, type DeviceId, type RegionId, type SegmentId } from '../data/dimensions';

export type SectionId =
  | 'overview' | 'audience' | 'behavior' | 'browsing' | 'segments'
  | 'journey' | 'preferences' | 'predictive' | 'insights';

export const SECTION_IDS: SectionId[] = ['overview', 'audience', 'behavior', 'browsing', 'segments', 'journey', 'preferences', 'predictive', 'insights'];

export interface Toast { id: number; message: string; tone?: 'success' | 'info' }

interface Ctx {
  cells: Cell[];
  filters: Filters;
  preset: number | 'custom';
  section: SectionId;
  setSection: (s: SectionId) => void;
  setPreset: (days: number) => void;
  setCustomRange: (start: number, end: number) => void;
  toggleSegment: (s: SegmentId) => void;
  toggleDevice: (d: DeviceId) => void;
  toggleRegion: (r: RegionId) => void;
  setSegments: (s: SegmentId[]) => void;
  setDevices: (d: DeviceId[]) => void;
  setRegions: (r: RegionId[]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  agg: Aggregation;
  prevAgg: Aggregation | null;
  metrics: Metrics;
  prevMetrics: Metrics | null;
  daily: DailyPoint[];
  prevDaily: DailyPoint[] | null;
  trendMetric: KpiKey;
  setTrendMetric: (k: KpiKey) => void;
  focusSegment: SegmentId | null;
  setFocusSegment: (s: SegmentId | null) => void;
  toasts: Toast[];
  notify: (message: string, tone?: Toast['tone']) => void;
  exportOpen: boolean;
  setExportOpen: (v: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
}

const DashboardContext = createContext<Ctx | null>(null);

const LAST = DATA_DAYS - 1;
const DEFAULT_PRESET = 30;
const defaultFilters = (): Filters => ({ start: LAST - DEFAULT_PRESET + 1, end: LAST, segments: [], devices: [], regions: [] });

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function readHash(): SectionId {
  const h = typeof window !== 'undefined' ? window.location.hash.replace('#/', '').replace('#', '') : '';
  return (SECTION_IDS as string[]).includes(h) ? (h as SectionId) : 'overview';
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const cells = useMemo(() => generateCells(), []);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [preset, setPresetState] = useState<number | 'custom'>(DEFAULT_PRESET);
  const [section, setSectionState] = useState<SectionId>(readHash);
  const [trendMetric, setTrendMetric] = useState<KpiKey>('uniqueVisitors');
  const [focusSegment, setFocusSegment] = useState<SegmentId | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setSectionState(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setSection = useCallback((s: SectionId) => {
    setSectionState(s);
    if (window.location.hash !== `#/${s}`) window.history.replaceState(null, '', `#/${s}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const agg = useMemo(() => aggregate(cells, filters), [cells, filters]);
  const prevAgg = useMemo(() => {
    const len = filters.end - filters.start + 1;
    const ps = filters.start - len;
    if (ps < 0) return null;
    return aggregate(cells, filters, ps, filters.start - 1);
  }, [cells, filters]);
  const metrics = useMemo(() => metricsForAggregation(agg), [agg]);
  const prevMetrics = useMemo(() => (prevAgg ? metricsForAggregation(prevAgg) : null), [prevAgg]);
  const daily = useMemo(() => dailySeries(agg), [agg]);
  const prevDaily = useMemo(() => (prevAgg ? dailySeries(prevAgg) : null), [prevAgg]);

  const value: Ctx = {
    cells, filters, preset, section, setSection,
    setPreset: (days) => { setPresetState(days); setFilters((f) => ({ ...f, start: LAST - days + 1, end: LAST })); },
    setCustomRange: (start, end) => {
      const s = Math.max(0, Math.min(start, end)), e = Math.min(LAST, Math.max(start, end));
      setPresetState('custom'); setFilters((f) => ({ ...f, start: s, end: e }));
    },
    toggleSegment: (s) => setFilters((f) => ({ ...f, segments: toggle(f.segments, s) })),
    toggleDevice: (d) => setFilters((f) => ({ ...f, devices: toggle(f.devices, d) })),
    toggleRegion: (r) => setFilters((f) => ({ ...f, regions: toggle(f.regions, r) })),
    setSegments: (segments) => setFilters((f) => ({ ...f, segments })),
    setDevices: (devices) => setFilters((f) => ({ ...f, devices })),
    setRegions: (regions) => setFilters((f) => ({ ...f, regions })),
    resetFilters: () => { setFilters(defaultFilters()); setPresetState(DEFAULT_PRESET); setFocusSegment(null); notify('Filters reset to defaults', 'info'); },
    activeFilterCount: filters.segments.length + filters.devices.length + filters.regions.length + (preset !== DEFAULT_PRESET ? 1 : 0),
    agg, prevAgg, metrics, prevMetrics, daily, prevDaily,
    trendMetric, setTrendMetric, focusSegment, setFocusSegment,
    toasts, notify, exportOpen, setExportOpen, paletteOpen, setPaletteOpen,
  };
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
