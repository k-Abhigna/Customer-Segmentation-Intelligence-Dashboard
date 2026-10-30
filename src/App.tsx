import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { DashboardProvider, SECTION_IDS, useDashboard } from './state/DashboardContext';
import { CommandPalette, ExportCenter, FilterBar, Sidebar, Toasts, Topbar } from './components/Shell';
import { cx } from './components/ui';
import Overview from './sections/Overview';
import Audience from './sections/Audience';
import Behavior from './sections/Behavior';
import Browsing from './sections/Browsing';
import Segments from './sections/Segments';
import Journey from './sections/Journey';
import Preferences from './sections/Preferences';
import Predictive from './sections/Predictive';
import Insights from './sections/Insights';

const VIEWS = { overview: Overview, audience: Audience, behavior: Behavior, browsing: Browsing, segments: Segments, journey: Journey, preferences: Preferences, predictive: Predictive, insights: Insights };

function Layout() {
  const { section, setSection, setPaletteOpen, resetFilters } = useDashboard();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const View = VIEWS[section];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true); return; }
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key)) setSection(SECTION_IDS[Number(e.key) - 1]);
      if (e.key.toLowerCase() === 'r') resetFilters();
      if (e.key === '/') { e.preventDefault(); setPaletteOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen, setSection, resetFilters]);

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 relative">
      <div className="bg-aurora" aria-hidden />
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className={cx('relative transition-[padding] duration-300', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="px-4 sm:px-6 xl:px-8 py-6 max-w-[1680px] mx-auto">
          <FilterBar />
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <View />
            </motion.div>
          </AnimatePresence>
          <footer className="mt-10 pt-5 border-t border-white/5 flex flex-col sm:flex-row gap-2 justify-between text-[11px] text-ink-500">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400/70" /> All data is synthetic and aggregated. No personally identifiable information, no individual-level profiling, no sensitive inference.</span>
            <span>BehaviorIQ prototype · forecasts are simulated · insights are rule-based</span>
          </footer>
        </main>
      </div>
      <CommandPalette />
      <ExportCenter />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <Layout />
    </DashboardProvider>
  );
}
