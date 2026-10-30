import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, BarChart3, Bell, BrainCircuit, Calendar, Check, ChevronDown, ChevronLeft, Compass, Database, Download,
  Fingerprint, Globe2, Heart, LayoutDashboard, LogOut, Map, Menu, MonitorSmartphone, RotateCcw, Search, Settings,
  ShieldCheck, Sparkles, Users, X, Keyboard, Route, SlidersHorizontal, FileDown, Command,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DATA_DAYS, DEVICES, PAGES, REGIONS, SEGMENTS, KEYWORDS } from '../data/dimensions';
import { DATASETS } from '../data/datasets';
import { dateAt, dayIndexOf } from '../data/generator';
import { fmtDate } from '../data/engine';
import { downloadCSV } from '../lib/csv';
import { useDashboard, type SectionId } from '../state/DashboardContext';
import { cx } from './ui';

export const NAV: { id: SectionId; label: string; icon: ReactNode; group: string }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17} />, group: 'Analyze' },
  { id: 'audience', label: 'Audience Intelligence', icon: <Users size={17} />, group: 'Analyze' },
  { id: 'behavior', label: 'Behavior Analytics', icon: <Activity size={17} />, group: 'Analyze' },
  { id: 'browsing', label: 'Browsing Patterns', icon: <Compass size={17} />, group: 'Analyze' },
  { id: 'segments', label: 'Customer Segmentation', icon: <Fingerprint size={17} />, group: 'Understand' },
  { id: 'journey', label: 'Journey Analysis', icon: <Route size={17} />, group: 'Understand' },
  { id: 'preferences', label: 'Preference Intelligence', icon: <Heart size={17} />, group: 'Understand' },
  { id: 'predictive', label: 'Predictive Insights', icon: <BrainCircuit size={17} />, group: 'Anticipate' },
  { id: 'insights', label: 'AI Recommendations', icon: <Sparkles size={17} />, group: 'Anticipate' },
];

// ───────────────────────────── Sidebar ─────────────────────────────
export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: { collapsed: boolean; setCollapsed: (v: boolean) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const { section, setSection } = useDashboard();
  const groups = [...new Set(NAV.map((n) => n.group))];
  const content = (isMobile: boolean) => (
    <div className="h-full flex flex-col">
      <div className={cx('flex items-center gap-3 px-4 h-16 border-b border-white/5 shrink-0', collapsed && !isMobile && 'justify-center px-0')}>
        <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-400 grid place-items-center shadow-glow shrink-0">
          <BrainCircuit size={19} className="text-white" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-ink-900 pulse-dot" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold text-white leading-tight tracking-tight">Behavior<span className="text-gradient">IQ</span></div>
            <div className="text-[10.5px] text-ink-400 leading-tight">Human Behavior Intelligence</div>
          </div>
        )}
        {isMobile && <button onClick={() => setMobileOpen(false)} className="ml-auto text-ink-300 hover:text-white" aria-label="Close menu"><X size={18} /></button>}
      </div>
      <nav className="flex-1 overflow-y-auto thin-scroll py-4 px-3 space-y-5">
        {groups.map((g) => (
          <div key={g}>
            {(!collapsed || isMobile) && <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-500 font-medium">{g}</div>}
            <div className="space-y-0.5">
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = section === n.id;
                return (
                  <button key={n.id} onClick={() => { setSection(n.id); setMobileOpen(false); }} title={n.label}
                    className={cx('relative w-full flex items-center gap-3 rounded-xl px-3 h-10 text-[13px] transition-colors group',
                      collapsed && !isMobile && 'justify-center px-0',
                      active ? 'text-white' : 'text-ink-300 hover:text-white hover:bg-white/[0.04]')}>
                    {active && (
                      <motion.span layoutId={isMobile ? 'nav-active-m' : 'nav-active'} className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 via-violet-500/15 to-transparent border border-white/10"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }} />
                    )}
                    {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-cyan-300 to-violet-400" />}
                    <span className={cx('relative shrink-0', active ? 'text-cyan-300' : 'text-ink-400 group-hover:text-ink-200')}>{n.icon}</span>
                    {(!collapsed || isMobile) && <span className="relative truncate font-medium">{n.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-white/5 shrink-0">
        {(!collapsed || isMobile) ? (
          <div className="rounded-xl bg-gradient-to-br from-emerald-400/10 to-cyan-400/5 border border-emerald-300/15 p-3">
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium"><ShieldCheck size={14} /> Privacy-first mode</div>
            <p className="text-[10.5px] text-ink-300 mt-1 leading-relaxed">Synthetic, aggregated data only. No PII, k≥50 cohort suppression.</p>
          </div>
        ) : (
          <div className="grid place-items-center text-emerald-300" title="Privacy-first: synthetic aggregated data"><ShieldCheck size={18} /></div>
        )}
        {!isMobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="mt-2 w-full h-8 rounded-lg text-ink-400 hover:text-white hover:bg-white/[0.04] grid place-items-center" aria-label="Toggle sidebar">
            <ChevronLeft size={16} className={cx('transition-transform', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>
    </div>
  );
  return (
    <>
      <aside className={cx('hidden lg:block fixed inset-y-0 left-0 z-40 border-r border-white/5 bg-ink-900/70 backdrop-blur-2xl transition-[width] duration-300', collapsed ? 'w-[76px]' : 'w-[264px]')}>
        {content(false)}
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-ink-900 border-r border-white/10"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
              {content(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ───────────────────────────── Dropdown helper ─────────────────────────────
function useClickOutside(ref: React.RefObject<HTMLElement>, onOut: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOut]);
}

function Dropdown({ trigger, children, align = 'right', width = 280 }: { trigger: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}
            className={cx('absolute top-full mt-2 z-50 rounded-2xl bg-ink-850/95 border border-white/10 shadow-2xl backdrop-blur-2xl p-2 max-w-[calc(100vw-24px)]', align === 'right' ? 'right-0' : 'left-0')}
            style={{ width }}>
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────────── Top bar ─────────────────────────────
const PRESETS = [7, 14, 30, 60, 90];

export function DateRangePicker() {
  const { filters, preset, setPreset, setCustomRange } = useDashboard();
  const [s, setS] = useState(dateAt(filters.start));
  const [e, setE] = useState(dateAt(filters.end));
  useEffect(() => { setS(dateAt(filters.start)); setE(dateAt(filters.end)); }, [filters.start, filters.end]);
  const min = dateAt(0), max = dateAt(DATA_DAYS - 1);
  return (
    <Dropdown width={300} trigger={(open) => (
      <button className={cx('h-9 inline-flex items-center gap-2 rounded-xl border px-3 text-[13px] transition-colors', open ? 'border-blue-400/40 bg-blue-500/10 text-white' : 'border-white/10 bg-white/[0.03] text-ink-100 hover:bg-white/[0.06]')}>
        <Calendar size={15} className="text-cyan-300" />
        <span className="hidden sm:inline">{fmtDate(dateAt(filters.start))} – {fmtDate(dateAt(filters.end))}</span>
        <span className="sm:hidden">{preset === 'custom' ? 'Custom' : `${preset}d`}</span>
        <ChevronDown size={14} className="text-ink-400" />
      </button>
    )}>
      {(close) => (
        <div>
          <div className="px-2 pt-1 pb-2 text-[10.5px] uppercase tracking-[0.16em] text-ink-400">Quick ranges</div>
          <div className="grid grid-cols-3 gap-1.5 px-1">
            {PRESETS.map((d) => (
              <button key={d} onClick={() => { setPreset(d); close(); }}
                className={cx('h-8 rounded-lg text-xs border transition-colors', preset === d ? 'bg-gradient-to-r from-blue-500/30 to-violet-500/30 border-white/15 text-white' : 'border-white/5 bg-white/[0.03] text-ink-200 hover:bg-white/[0.07]')}>
                Last {d} days
              </button>
            ))}
          </div>
          <div className="px-2 pt-3 pb-2 text-[10.5px] uppercase tracking-[0.16em] text-ink-400">Custom range</div>
          <div className="grid grid-cols-2 gap-2 px-1">
            <label className="text-[11px] text-ink-300">From<input type="date" min={min} max={max} value={s} onChange={(ev) => setS(ev.target.value)} className="date-input mt-1" /></label>
            <label className="text-[11px] text-ink-300">To<input type="date" min={min} max={max} value={e} onChange={(ev) => setE(ev.target.value)} className="date-input mt-1" /></label>
          </div>
          <button onClick={() => { if (s && e) { setCustomRange(dayIndexOf(s), dayIndexOf(e)); close(); } }}
            className="mt-3 mx-1 w-[calc(100%-8px)] h-8 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs font-medium hover:brightness-110">Apply custom range</button>
          <p className="px-2 pt-2 text-[10.5px] text-ink-400 leading-relaxed">Synthetic data available {fmtDate(min)} – {fmtDate(max)}, 2026. Comparisons use the equal-length preceding period.</p>
        </div>
      )}
    </Dropdown>
  );
}

const NOTIFS = [
  { id: 1, title: 'Anomaly: mobile checkout drop-off up', body: 'Mobile cart→order abandonment is 16 pts above desktop this period.', tone: 'rose', time: '12m ago', section: 'journey' as SectionId },
  { id: 2, title: 'Segment shift detected', body: 'At-Risk Customers grew vs the prior 14 days (rule-based monitor).', tone: 'amber', time: '1h ago', section: 'segments' as SectionId },
  { id: 3, title: 'Campaign peak reached', body: 'Autumn campaign landing traffic peaked mid-October.', tone: 'cyan', time: '3h ago', section: 'browsing' as SectionId },
  { id: 4, title: 'Weekly data pack ready', body: 'BI export files refreshed for Power BI / Tableau.', tone: 'emerald', time: 'Yesterday', section: 'overview' as SectionId },
];

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { setPaletteOpen, setSection, setExportOpen, resetFilters, notify } = useDashboard();
  const [read, setRead] = useState<number[]>([]);
  const unread = NOTIFS.filter((n) => !read.includes(n.id)).length;
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/5 bg-ink-950/70 backdrop-blur-2xl">
      <div className="h-full flex items-center gap-2 sm:gap-3 px-4 sm:px-6">
        <button onClick={onMenu} className="lg:hidden h-9 w-9 grid place-items-center rounded-xl border border-white/10 text-ink-200" aria-label="Open menu"><Menu size={18} /></button>
        <button onClick={() => setPaletteOpen(true)}
          className="flex-1 max-w-md h-9 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-ink-400 hover:border-white/20 hover:bg-white/[0.05] transition-colors min-w-0">
          <Search size={15} className="shrink-0" />
          <span className="truncate">Search sections, segments, pages, keywords…</span>
          <span className="ml-auto hidden md:inline-flex items-center gap-0.5 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-ink-400 font-mono"><Command size={10} />K</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <DateRangePicker />
          <Dropdown width={340} trigger={() => (
            <button className="relative h-9 w-9 grid place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-ink-200 hover:text-white hover:bg-white/[0.06]" aria-label="Notifications">
              <Bell size={16} />
              {unread > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-gradient-to-r from-rose-500 to-violet-500 text-[9.5px] font-bold text-white grid place-items-center">{unread}</span>}
            </button>
          )}>
            {(close) => (
              <div>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm font-medium text-white">Notifications</span>
                  <button onClick={() => setRead(NOTIFS.map((n) => n.id))} className="text-[11px] text-cyan-300 hover:text-cyan-200">Mark all read</button>
                </div>
                <div className="space-y-1 mt-1">
                  {NOTIFS.map((n) => (
                    <button key={n.id} onClick={() => { setRead((r) => [...new Set([...r, n.id])]); setSection(n.section); close(); }}
                      className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-white/[0.05] flex gap-3">
                      <span className={cx('mt-1.5 h-2 w-2 rounded-full shrink-0', read.includes(n.id) ? 'bg-ink-600' : { rose: 'bg-rose-400', amber: 'bg-amber-400', cyan: 'bg-cyan-400', emerald: 'bg-emerald-400' }[n.tone])} />
                      <span className="min-w-0">
                        <span className={cx('block text-[13px] font-medium', read.includes(n.id) ? 'text-ink-300' : 'text-ink-100')}>{n.title}</span>
                        <span className="block text-[11.5px] text-ink-400 leading-snug mt-0.5">{n.body}</span>
                        <span className="block text-[10.5px] text-ink-500 mt-1">{n.time} · rule-based monitor</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Dropdown>
          <Dropdown width={260} trigger={(open) => (
            <button className={cx('h-9 flex items-center gap-2 rounded-xl border pl-1 pr-2 transition-colors', open ? 'border-blue-400/40 bg-blue-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]')}>
              <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center text-[11px] font-bold text-white">DA</span>
              <span className="hidden md:block text-left leading-tight">
                <span className="block text-[12px] text-white font-medium">Demo Analyst</span>
                <span className="block text-[10px] text-ink-400">Insights Workspace</span>
              </span>
              <ChevronDown size={14} className="text-ink-400 hidden md:block" />
            </button>
          )}>
            {(close) => (
              <div className="text-sm">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <div className="text-white font-medium">Demo Analyst</div>
                  <div className="text-[11px] text-ink-400">Role: Analyst · Synthetic workspace</div>
                </div>
                {[
                  { icon: <FileDown size={15} />, label: 'Export center (BI data pack)', on: () => setExportOpen(true) },
                  { icon: <Keyboard size={15} />, label: 'Keyboard shortcuts', on: () => notify('⌘/Ctrl+K search · 1–9 jump to section · R reset filters', 'info') },
                  { icon: <RotateCcw size={15} />, label: 'Reset all filters', on: resetFilters },
                  { icon: <Settings size={15} />, label: 'Data & privacy settings', on: () => notify('Privacy mode is enforced: synthetic, aggregated, k≥50.', 'info') },
                  { icon: <LogOut size={15} />, label: 'Sign out (demo)', on: () => notify('This is a demo — no account to sign out of.', 'info') },
                ].map((i) => (
                  <button key={i.label} onClick={() => { i.on(); close(); }} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-ink-200 hover:text-white hover:bg-white/[0.05]">
                    <span className="text-ink-400">{i.icon}</span>{i.label}
                  </button>
                ))}
              </div>
            )}
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

// ───────────────────────────── Filter bar ─────────────────────────────
function MultiSelect<T extends string>({ label, icon, options, value, onToggle, onClear }: {
  label: string; icon: ReactNode; options: { id: T; name: string; color?: string }[]; value: T[]; onToggle: (v: T) => void; onClear: () => void;
}) {
  return (
    <Dropdown align="left" width={250} trigger={(open) => (
      <button className={cx('h-8 inline-flex items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors whitespace-nowrap',
        value.length ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100' : open ? 'border-white/20 bg-white/[0.06] text-white' : 'border-white/10 bg-white/[0.03] text-ink-200 hover:bg-white/[0.06]')}>
        <span className="text-ink-300">{icon}</span>{label}
        {value.length > 0 && <span className="rounded-md bg-cyan-300/20 px-1.5 text-[10px] font-semibold">{value.length}</span>}
        <ChevronDown size={13} className="text-ink-400" />
      </button>
    )}>
      {() => (
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-400">{label}</span>
            {value.length > 0 && <button onClick={onClear} className="text-[11px] text-cyan-300">Clear</button>}
          </div>
          {options.map((o) => {
            const on = value.includes(o.id);
            return (
              <button key={o.id} onClick={() => onToggle(o.id)} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-100 hover:bg-white/[0.05]">
                <span className={cx('h-4 w-4 rounded-[5px] border grid place-items-center transition-colors', on ? 'bg-cyan-400 border-cyan-300' : 'border-white/20')}>{on && <Check size={11} className="text-ink-950" strokeWidth={3} />}</span>
                {o.color && <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />}
                {o.name}
              </button>
            );
          })}
          <p className="px-2.5 pt-1 pb-1 text-[10.5px] text-ink-400">None selected = all</p>
        </div>
      )}
    </Dropdown>
  );
}

export function FilterBar() {
  const { filters, toggleSegment, toggleDevice, toggleRegion, setSegments, setRegions, resetFilters, activeFilterCount, setExportOpen, agg } = useDashboard();
  const chips = [
    ...filters.segments.map((s) => ({ k: 's' + s, label: SEGMENTS.find((x) => x.id === s)!.short, color: SEGMENTS.find((x) => x.id === s)!.color, on: () => toggleSegment(s) })),
    ...filters.devices.map((s) => ({ k: 'd' + s, label: DEVICES.find((x) => x.id === s)!.name, color: DEVICES.find((x) => x.id === s)!.color, on: () => toggleDevice(s) })),
    ...filters.regions.map((s) => ({ k: 'r' + s, label: REGIONS.find((x) => x.id === s)!.short, color: REGIONS.find((x) => x.id === s)!.color, on: () => toggleRegion(s) })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-ink-400 mr-1"><SlidersHorizontal size={13} /> Filters</span>
      <MultiSelect label="Segment" icon={<Fingerprint size={13} />} options={SEGMENTS.map((s) => ({ id: s.id, name: s.name, color: s.color }))} value={filters.segments} onToggle={toggleSegment} onClear={() => setSegments([])} />
      <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
        {DEVICES.map((d) => {
          const on = filters.devices.includes(d.id);
          return (
            <button key={d.id} onClick={() => toggleDevice(d.id)} className={cx('h-7 px-2.5 rounded-md text-xs transition-colors inline-flex items-center gap-1.5', on ? 'bg-cyan-400/15 text-cyan-100' : 'text-ink-300 hover:text-white')}>
              <MonitorSmartphone size={12} className={on ? 'text-cyan-300' : 'text-ink-500'} />{d.name}
            </button>
          );
        })}
      </div>
      <MultiSelect label="Region" icon={<Globe2 size={13} />} options={REGIONS.map((s) => ({ id: s.id, name: s.name, color: s.color }))} value={filters.regions} onToggle={toggleRegion} onClear={() => setRegions([])} />
      <AnimatePresence>
        {chips.map((c) => (
          <motion.button key={c.k} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={c.on} className="h-7 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] pl-2 pr-1.5 text-[11px] text-ink-100 hover:bg-white/10">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />{c.label}<X size={11} className="text-ink-400" />
          </motion.button>
        ))}
      </AnimatePresence>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden xl:inline text-[11px] text-ink-400 font-mono">{agg.total.sessions.toLocaleString()} sessions in scope</span>
        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-ink-200 hover:text-white hover:bg-white/[0.06]">
            <RotateCcw size={12} />Reset
          </button>
        )}
        <button onClick={() => setExportOpen(true)} className="h-8 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500/80 to-violet-500/80 border border-white/10 px-3 text-xs text-white font-medium hover:brightness-110">
          <Download size={13} />Export
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── Command palette ─────────────────────────────
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setSection, toggleSegment, filters, setFocusSegment, toggleDevice, toggleRegion, setExportOpen, resetFilters } = useDashboard();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (paletteOpen) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [paletteOpen]);

  const items = useMemo(() => {
    const all: { group: string; label: string; hint: string; icon: ReactNode; run: () => void }[] = [
      ...NAV.map((n) => ({ group: 'Sections', label: n.label, hint: 'Go to section', icon: n.icon, run: () => setSection(n.id) })),
      ...SEGMENTS.map((s) => ({ group: 'Segments', label: s.name, hint: 'Inspect segment', icon: <Fingerprint size={15} />, run: () => { setFocusSegment(s.id); setSection('segments'); } })),
      ...SEGMENTS.map((s) => ({ group: 'Filters', label: `${filters.segments.includes(s.id) ? 'Remove' : 'Filter by'} segment: ${s.name}`, hint: 'Toggle filter', icon: <SlidersHorizontal size={15} />, run: () => toggleSegment(s.id) })),
      ...DEVICES.map((d) => ({ group: 'Filters', label: `${filters.devices.includes(d.id) ? 'Remove' : 'Filter by'} device: ${d.name}`, hint: 'Toggle filter', icon: <MonitorSmartphone size={15} />, run: () => toggleDevice(d.id) })),
      ...REGIONS.map((r) => ({ group: 'Filters', label: `${filters.regions.includes(r.id) ? 'Remove' : 'Filter by'} region: ${r.name}`, hint: 'Toggle filter', icon: <Map size={15} />, run: () => toggleRegion(r.id) })),
      ...PAGES.map((p) => ({ group: 'Pages', label: `${p.name}  ${p.path}`, hint: 'Explore navigation', icon: <Compass size={15} />, run: () => setSection('browsing') })),
      ...KEYWORDS.map((k) => ({ group: 'Search keywords', label: k.term, hint: 'Preference intelligence', icon: <Search size={15} />, run: () => setSection('preferences') })),
      { group: 'Actions', label: 'Open export center', hint: 'CSV / BI', icon: <Database size={15} />, run: () => setExportOpen(true) },
      { group: 'Actions', label: 'Reset all filters', hint: 'R', icon: <RotateCcw size={15} />, run: resetFilters },
      { group: 'Actions', label: 'Generate AI insights', hint: 'Rule-based', icon: <Sparkles size={15} />, run: () => setSection('insights') },
      { group: 'Actions', label: 'Run what-if forecast', hint: 'Simulated', icon: <BarChart3 size={15} />, run: () => setSection('predictive') },
    ];
    const t = q.trim().toLowerCase();
    return (t ? all.filter((i) => i.label.toLowerCase().includes(t) || i.group.toLowerCase().includes(t)) : all.filter((i) => i.group !== 'Filters' && i.group !== 'Search keywords' && i.group !== 'Pages')).slice(0, 40);
  }, [q, filters, setSection, toggleSegment, setFocusSegment, toggleDevice, toggleRegion, setExportOpen, resetFilters]);

  const run = (i: number) => { const it = items[i]; if (!it) return; it.run(); setPaletteOpen(false); };

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPaletteOpen(false)}>
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-2xl bg-ink-850/95 border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5">
              <Search size={17} className="text-cyan-300" />
              <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} placeholder="Search sections, segments, filters, pages, keywords…"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
                  if (e.key === 'Enter') run(idx);
                  if (e.key === 'Escape') setPaletteOpen(false);
                }}
                className="flex-1 bg-transparent text-[15px] text-white placeholder:text-ink-400 focus:outline-none" />
              <kbd className="text-[10px] text-ink-400 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto thin-scroll p-2">
              {items.length === 0 && <div className="py-10 text-center text-sm text-ink-400">No results for “{q}”</div>}
              {items.map((it, i) => (
                <div key={it.group + it.label}>
                  {(i === 0 || items[i - 1].group !== it.group) && <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.16em] text-ink-500">{it.group}</div>}
                  <button onMouseEnter={() => setIdx(i)} onClick={() => run(i)} className={cx('w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px]', idx === i ? 'bg-blue-500/15 text-white' : 'text-ink-200')}>
                    <span className={idx === i ? 'text-cyan-300' : 'text-ink-400'}>{it.icon}</span>
                    <span className="flex-1 truncate">{it.label}</span>
                    <span className="text-[11px] text-ink-500">{it.hint}</span>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ───────────────────────────── Export center ─────────────────────────────
const BI_TOOLS = [
  { name: 'Power BI', how: 'Get Data → Text/CSV → load fact_daily_behavior + dim_* and relate on *_id.' },
  { name: 'Tableau', how: 'Connect → Text file → add dim tables as relationships to the fact table.' },
  { name: 'Qlik Sense', how: 'Add data → Files → associate on matching *_id field names automatically.' },
  { name: 'Looker Studio', how: 'Add data → File Upload (CSV) or push to Google Sheets / BigQuery.' },
  { name: 'Zoho Analytics', how: 'Import Data → Files → CSV; set *_id columns as lookup columns.' },
  { name: 'Power Automate', how: 'Use the /data folder in OneDrive/SharePoint as a trigger source for refresh flows.' },
];

export function ExportCenter() {
  const { exportOpen, setExportOpen, cells, filters, notify } = useDashboard();
  return (
    <AnimatePresence>
      {exportOpen && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExportOpen(false)}>
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-2xl bg-ink-850/95 border border-white/10 shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2 text-white font-display text-lg font-semibold"><Database size={18} className="text-cyan-300" /> Export center</div>
                <p className="text-xs text-ink-300 mt-1">Star-schema CSVs reflecting your current filters ({fmtDate(dateAt(filters.start))} – {fmtDate(dateAt(filters.end))}). Synthetic & aggregated — safe to share.</p>
              </div>
              <button onClick={() => setExportOpen(false)} className="text-ink-400 hover:text-white" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto thin-scroll p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-2.5">
                {DATASETS.map((d) => (
                  <div key={d.id} className="rounded-xl border border-white/5 bg-white/[0.025] p-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-white font-medium">{d.name}</div>
                      <div className="text-[10.5px] font-mono text-cyan-300/80 mt-0.5">{d.id}.csv · {d.grain}</div>
                      <div className="text-[11px] text-ink-400 mt-1 leading-snug">{d.description}</div>
                    </div>
                    <button onClick={() => { const rows = d.build(cells, filters); downloadCSV(d.id, rows); notify(`Exported ${rows.length.toLocaleString()} rows → ${d.id}.csv`); }}
                      className="h-8 w-8 shrink-0 grid place-items-center rounded-lg border border-white/10 text-ink-200 hover:text-white hover:bg-blue-500/20" aria-label={`Download ${d.id}`}>
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-400 mb-2">Connect your BI tool</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {BI_TOOLS.map((b) => (
                    <div key={b.name} className="rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
                      <div className="text-[12.5px] text-white font-medium">{b.name}</div>
                      <div className="text-[11px] text-ink-400 mt-0.5 leading-snug">{b.how}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-ink-400 mt-3">Full-history files (all 180 days, unfiltered) are also committed in the repository’s <span className="font-mono text-ink-200">/data</span> folder, with a data dictionary.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const { toasts } = useDashboard();
  return (
    <div className="fixed bottom-4 right-4 z-[70] space-y-2 w-[min(360px,calc(100vw-32px))]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
            className="rounded-xl bg-ink-850/95 border border-white/10 shadow-2xl backdrop-blur-xl px-4 py-3 text-[13px] text-ink-100 flex items-center gap-2.5">
            <span className={cx('h-6 w-6 rounded-lg grid place-items-center shrink-0', t.tone === 'info' ? 'bg-blue-500/20 text-blue-200' : 'bg-emerald-500/20 text-emerald-200')}>
              {t.tone === 'info' ? <Sparkles size={13} /> : <Check size={13} />}
            </span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
