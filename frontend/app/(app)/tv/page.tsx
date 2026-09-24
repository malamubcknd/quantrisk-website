"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { fetchTvSlideshow, TvSlideshowData } from '@/lib/api';
import { 
  Play, Pause, ChevronLeft, ChevronRight, Tv, Shield, Briefcase, 
  TrendingUp, Cpu, Wifi, Globe, Radio, RefreshCw, Clock, Maximize, Minimize, CheckCircle
} from 'lucide-react';

interface TvNewsItem {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  publishedAt: string | null;
  severity: number;
  mtnRelevance: number;
  sentiment: string;
  subcategory: string;
}

interface TvAlertItem {
  id: string;
  headline: string;
  summary: string;
  tier: string;
  severity: number;
  impactGhsMid: number | null;
  sourceName: string;
  createdAt: string | null;
  subcategory: string;
}

interface SlideItem {
  category: string;
  news: TvNewsItem[];
  alerts: TvAlertItem[];
  pageNumber: number;
  totalPages: number;
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Strategic:    { label: 'Strategic Risk',    color: 'text-red-400',    bg: 'bg-red-950/20', border: 'border-red-500/30', icon: <Shield className="w-6 h-6 text-red-400" /> },
  Governance:   { label: 'Governance Risk',   color: 'text-slate-400',  bg: 'bg-slate-900/40', border: 'border-slate-500/30', icon: <Briefcase className="w-6 h-6 text-slate-400" /> },
  Financial:    { label: 'Financial Risk',    color: 'text-yellow-400', bg: 'bg-yellow-950/20', border: 'border-yellow-500/30', icon: <TrendingUp className="w-6 h-6 text-yellow-400" /> },
  Technology:   { label: 'Technology Risk',   color: 'text-blue-400',   bg: 'bg-blue-950/20', border: 'border-blue-500/30', icon: <Cpu className="w-6 h-6 text-blue-400" /> },
  Operational:  { label: 'Operational Risk',  color: 'text-orange-400', bg: 'bg-orange-950/20', border: 'border-orange-500/30', icon: <Wifi className="w-6 h-6 text-orange-400" /> },
  External:     { label: 'External Risk',     color: 'text-pink-400',   bg: 'bg-pink-950/20', border: 'border-pink-500/30', icon: <Globe className="w-6 h-6 text-pink-400" /> },
  Other:        { label: 'Other Risk',        color: 'text-gray-400',   bg: 'bg-gray-900/40', border: 'border-gray-500/30', icon: <Radio className="w-6 h-6 text-gray-400" /> },
};

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function TvPage() {
  const [data, setData] = useState<TvSlideshowData | null>(null);
  const [days, setDays] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [time, setTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const slideDuration = 60000; // 60 seconds
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch Slideshow Items
  const loadData = useCallback(async (selectedDays: number) => {
    setLoading(true);
    try {
      const res = await fetchTvSlideshow(selectedDays);
      setData(res);
      setActiveSlideIndex(0);
      setProgress(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(days);
  }, [days, loadData]);

  // Digital clock update
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Structural slideshow processing
  const slides = useMemo<SlideItem[]>(() => {
    if (!data || !data.categories) return [];
    
    const computedSlides: SlideItem[] = [];

    Object.entries(data.categories).forEach(([categoryName, content]) => {
      const newsChunks = chunkArray(content.news || [], 3);
      const alertChunks = chunkArray(content.alerts || [], 3);
      
      const totalSlidesForCategory = Math.max(newsChunks.length, alertChunks.length);
      
      for (let i = 0; i < totalSlidesForCategory; i++) {
        computedSlides.push({
          category: categoryName,
          news: newsChunks[i] || [],
          alerts: alertChunks[i] || [],
          pageNumber: i + 1,
          totalPages: totalSlidesForCategory
        });
      }
    });

    return computedSlides;
  }, [data]);

  // Handle slide transitions
  const handleNext = useCallback(() => {
    setActiveSlideIndex((prev) => (slides.length > 0 ? (prev + 1) % slides.length : 0));
    setProgress(0);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setActiveSlideIndex((prev) => (slides.length > 0 ? (prev - 1 + slides.length) % slides.length : 0));
    setProgress(0);
  }, [slides.length]);

  // FIXED Auto-Progress Slide Transitions (Zero stale closures/state side-effects)
  useEffect(() => {
    if (!isPlaying || slides.length === 0) return;

    const tickInterval = 100; // Tick every 100ms for high-fluidity visual updates
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += tickInterval;
      const currentProgress = (elapsed / slideDuration) * 100;
      
      if (elapsed >= slideDuration) {
        handleNext();
        setProgress(0);
        elapsed = 0;
      } else {
        setProgress(currentProgress);
      }
    }, tickInterval);

    return () => {
      clearInterval(timer);
    };
  }, [isPlaying, slides.length, handleNext, slideDuration]);

  // HTML5 Native Fullscreen handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error(err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const currentSlide: SlideItem | undefined = slides[activeSlideIndex];
  const activeMeta = currentSlide ? (CATEGORY_META[currentSlide.category] ?? CATEGORY_META['Other']) : null;

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 bg-[#040409] text-white overflow-hidden flex flex-col font-sans select-none z-[9999]"
    >
      
      {/* HEADER BAR */}
      <header className="bg-[#080811] border-b border-white/5 h-24 px-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-mtn-yellow/10 border border-mtn-yellow/30 flex items-center justify-center">
            <Tv className="w-6 h-6 text-mtn-yellow animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono tracking-widest text-white/30 uppercase">Broadcast Dashboard System</span>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              MTN QuantRisk Live Feed
            </h1>
          </div>
        </div>

        {/* Categories indicator badge */}
        {currentSlide && activeMeta && (
          <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border-2 ${activeMeta.color} ${activeMeta.bg} ${activeMeta.border} transition-all duration-500 shadow-lg`}>
            {activeMeta.icon}
            <span className="text-lg font-mono font-bold tracking-widest uppercase">
              {activeMeta.label}
            </span>
            {currentSlide.totalPages > 1 && (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/15 text-white font-bold">
                Batch {currentSlide.pageNumber} / {currentSlide.totalPages}
              </span>
            )}
          </div>
        )}

        {/* Clock & Days Selector */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
            <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Cutoff:</span>
            <select 
              value={days} 
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-transparent text-sm font-mono font-bold text-mtn-yellow border-none focus:outline-none cursor-pointer [color-scheme:dark]"
            >
              <option value={3}>Last 3 Days</option>
              <option value={7}>Last 7 Days</option>
              <option value={10}>Last 10 Days</option>
              <option value={15}>Last 15 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-center gap-3 text-white/80 text-xl font-mono tracking-widest bg-black/30 border border-white/5 px-5 py-2 rounded-xl">
            <Clock className="w-5 h-5 text-white/30 animate-pulse" />
            <span>{time || "00:00:00"}</span>
          </div>
        </div>
      </header>

      {/* PROGRESS TIMER BAR */}
      <div className="w-full h-1.5 bg-[#0e0e1d] shrink-0">
        <div 
          className="h-full bg-mtn-yellow transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,208,0,0.5)]" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* CORE DISPLAY STAGE */}
      <main className="flex-1 min-h-0 flex bg-[#030307]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="w-12 h-12 text-mtn-yellow animate-spin" />
            <p className="text-sm font-mono text-white/40">Syncing live database streams...</p>
          </div>
        ) : slides.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-4">
            <Radio className="w-20 h-20 text-white/10 animate-bounce" />
            <h2 className="text-3xl font-bold">No active items inside target cutoff</h2>
            <p className="text-white/40 text-base max-w-xl">
              There are no highly relevant news elements (MTN Relevance &ge; 50%) or active alerts published in the last {days} days under this category.
            </p>
          </div>
        ) : currentSlide ? (
          <div className="flex-1 flex min-w-0">
            
            {/* LEFT PANE - NEWS COLUMN (60%) */}
            <section className="w-[60%] border-r-4 border-[#0c0c1b] p-10 flex flex-col justify-start overflow-hidden bg-[#05050b]/90">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2 pb-3 border-b border-white/5">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 animate-pulse" />
                  <h3 className="text-sm font-mono uppercase tracking-widest text-blue-400 font-extrabold">📡 Category News Feed</h3>
                </div>
                
                {currentSlide.news.length === 0 ? (
                  <div className="h-96 flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01] text-white/30">
                    <p className="text-lg font-mono">No active news reported for this category.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {currentSlide.news.map((item, idx) => (
                      <div 
                        key={item.id} 
                        className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3.5 transform transition-transform duration-300 shadow-md hover:scale-[1.005]"
                      >
                        <div className="flex items-start justify-between gap-5">
                          <h4 className="text-xl font-bold text-white leading-snug line-clamp-2">
                            {idx + 1}. {item.title}
                          </h4>
                          {item.sentiment && (
                            <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-extrabold uppercase shrink-0 tracking-wide border ${
                              item.sentiment === 'negative' ? 'text-red-400 bg-red-400/10 border-red-400/25' :
                              item.sentiment === 'positive' ? 'text-green-400 bg-green-400/10 border-green-400/25' :
                              'text-slate-400 bg-slate-400/10 border-slate-400/25'
                            }`}>
                              {item.sentiment}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-white/40">
                          {item.sourceName} &nbsp;·&nbsp; {fmtDate(item.publishedAt)}
                        </p>
                        <div className="text-base text-white/90 leading-relaxed bg-[#1b1c2b]/30 p-5 rounded-xl border-l-4 border-mtn-yellow font-sans">
                          {item.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* RIGHT PANE - RISK ALERTS COLUMN (40%) */}
            <section className="w-[40%] bg-black/40 p-10 flex flex-col justify-start overflow-hidden">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2 pb-3 border-b border-white/5">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
                  <h3 className="text-sm font-mono uppercase tracking-widest text-red-400 font-extrabold">🚨 Urgent Risk Alerts</h3>
                </div>

                {currentSlide.alerts.length === 0 ? (
                  <div className="flex-1 h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-green-500/15 rounded-3xl bg-[#030c05]/35 text-center p-8">
                    <CheckCircle className="w-16 h-16 text-green-400 mb-4 animate-pulse" />
                    <p className="text-xl font-mono font-bold text-green-400 uppercase tracking-widest mb-2">✔ No Urgent Risk Alerts</p>
                    <p className="text-sm text-white/45 max-w-xs leading-relaxed">No matching warning or critical alerts generated in this risk sector.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {currentSlide.alerts.map((item) => (
                      <div 
                        key={item.id} 
                        className="rounded-2xl border border-red-500/20 bg-red-950/5 p-6 space-y-3.5 relative overflow-hidden shadow-lg"
                      >
                        {/* Flashing warning strip */}
                        <div className="absolute right-0 top-0 h-1.5 w-24 bg-red-500 animate-pulse" />

                        <div className="flex items-start justify-between gap-5">
                          <h4 className="text-lg font-bold text-red-200 leading-snug line-clamp-2">
                            {item.headline}
                          </h4>
                          <span className="px-2.5 py-1 rounded-lg font-mono text-xs font-black uppercase shrink-0 bg-red-500/20 text-red-400 border border-red-500/30 tracking-wide">
                            {item.tier}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs font-mono text-white/40">
                          <span>{item.sourceName}</span>
                          <span className="text-red-400 font-bold">Severity: {item.severity.toFixed(1)}/10</span>
                        </div>

                        <div className="text-sm text-red-100/90 leading-relaxed bg-[#250d0d]/40 p-4.5 rounded-xl border-l-4 border-red-500">
                          {item.summary}
                        </div>

                        {item.impactGhsMid != null && (
                          <div className="flex items-center justify-between text-xs font-mono pt-1">
                            <span className="text-white/40">Projected Financial Impact:</span>
                            <span className="text-red-400 font-extrabold text-sm">GHS {item.impactGhsMid.toFixed(1)}m</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

          </div>
        ) : null}
      </main>

      {/* FOOTER CONTROL PREVIEW BAR */}
      <footer className="bg-[#080811] border-t border-white/5 h-20 px-10 flex items-center justify-between shrink-0 text-sm">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 bg-black/40 border border-white/5 p-1 rounded-xl">
            <button 
              onClick={handlePrev}
              className="p-2.5 hover:bg-white/5 rounded-lg transition"
              title="Previous Slide"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 hover:bg-white/5 rounded-lg transition text-mtn-yellow"
              title={isPlaying ? "Pause Rotation" : "Resume Rotation"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button 
              onClick={handleNext}
              className="p-2.5 hover:bg-white/5 rounded-lg transition"
              title="Next Slide"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
          {slides.length > 0 && (
            <span className="text-sm text-white/40 font-mono">
              Cycle Progress: {activeSlideIndex + 1} / {slides.length} slides
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-xs text-white/30 font-mono flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block animate-pulse" />
            QuantRisk Auto-Publish System Active · Cycling Category Batches Every 30s
          </div>
          
          {/* Cinema mode toggler */}
          <button 
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition text-xs font-mono uppercase tracking-wider font-bold"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4 text-mtn-yellow" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4 text-mtn-yellow" />
                <span>Cinema Mode</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}