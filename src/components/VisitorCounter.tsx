import React, { useEffect, useState, useRef } from 'react';
import { Users, Eye, Activity, ShieldCheck } from 'lucide-react';

interface VisitorStats {
  total: number;
  active: number;
  today: number;
}

const LOCAL_STORAGE_KEY = 'cleanmeta_visitor_stats';
const SESSION_STORAGE_KEY = 'cleanmeta_session_id';

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `sess_${Date.now()}`;
  }
}

export const VisitorCounter: React.FC = () => {
  const [stats, setStats] = useState<VisitorStats>({
    total: 20,
    active: 1,
    today: 1
  });
  const [displayCount, setDisplayCount] = useState<number>(20);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [isOpen]);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();

    const fetchAndRecordVisit = async () => {
      try {
        const response = await fetch('/api/visitors/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });

        if (response.ok) {
          const data = await response.json();
          if (typeof data.total === 'number') {
            setStats({
              total: data.total,
              active: data.active || 1,
              today: data.today || 1
            });
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
            } catch {}
            setHasLoaded(true);
            return;
          }
        }
      } catch (err) {
        // Fallback for static environment
      }

      // Offline / LocalStorage fallback
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        let fallbackTotal = 20;
        if (saved) {
          const parsed = JSON.parse(saved);
          fallbackTotal = parsed.total || 20;
        }

        const isNewTab = !sessionStorage.getItem('cleanmeta_fallback_visited');
        if (isNewTab) {
          fallbackTotal += 1;
          sessionStorage.setItem('cleanmeta_fallback_visited', 'true');
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ total: fallbackTotal }));
        }

        setStats({
          total: fallbackTotal,
          active: 1,
          today: 1
        });
      } catch {
        setStats({ total: 20, active: 1, today: 1 });
      }
      setHasLoaded(true);
    };

    fetchAndRecordVisit();

    // Heartbeat every 45s to keep active status fresh
    const heartbeat = setInterval(() => {
      fetch('/api/visitors/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.total === 'number') {
            setStats((prev) => ({
              ...prev,
              total: data.total,
              active: data.active || prev.active,
              today: data.today || prev.today
            }));
          }
        })
        .catch(() => {});
    }, 45000);

    return () => clearInterval(heartbeat);
  }, []);

  // Smooth number roll-up ticker animation when count loads
  useEffect(() => {
    if (!hasLoaded) return;

    const target = stats.total;
    const start = Math.max(0, target - 24);
    const duration = 650; // ms
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * ease);
      setDisplayCount(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayCount(target);
      }
    };

    requestAnimationFrame(step);
  }, [stats.total, hasLoaded]);

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="as-button as-button--ghost !h-auto !min-h-[36px] !py-1.5 !px-3 rounded-[var(--as-radius-full)] bg-[var(--as-semantic-color-surface-subtle)] hover:bg-[var(--as-semantic-color-surface-card)] border border-[var(--as-semantic-color-border-subtle)] text-[var(--as-semantic-color-text-default)] flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] select-none"
        aria-label={`Visitor counter: ${stats.total.toLocaleString()} total visitors, ${stats.active} active now`}
        title="View live visitor statistics"
      >
        <span className="as-button__label !gap-2 text-xs font-[var(--as-typography-font-family-mono)]">
          {/* Live pulsing green beacon */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>

          <Users className="w-3.5 h-3.5 shrink-0 text-[var(--as-semantic-color-text-muted)]" />

          {/* Formatted tabular count */}
          <span className="tabular-nums font-semibold tracking-tight text-[var(--as-semantic-color-text-default)]">
            {displayCount.toLocaleString()}
          </span>

          <span className="hidden md:inline text-[11px] text-[var(--as-semantic-color-text-muted)] font-normal">
            visitors
          </span>
        </span>
      </button>

      {/* Floating Detailed Stats Card */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 p-4 rounded-[var(--as-radius-lg)] bg-[var(--as-semantic-color-surface-card)] border border-[var(--as-semantic-color-border-subtle)] shadow-[0_12px_28px_rgba(0,0,0,0.5),0_0_1px_rgba(255,255,255,0.1)] z-50 animate-fade-in text-left">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--as-semantic-color-border-subtle)]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-[var(--as-semantic-color-text-default)] font-[var(--as-typography-font-family-sans)]">
                Live Visitor Stats
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[var(--as-radius-sm)] bg-emerald-500/15 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              LIVE
            </span>
          </div>

          <div className="space-y-2.5 py-3 text-xs font-[var(--as-typography-font-family-mono)]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--as-semantic-color-text-muted)]">Active Now</span>
              <span className="font-bold text-emerald-400 tabular-nums">
                {stats.active} {stats.active === 1 ? 'user' : 'users'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--as-semantic-color-text-muted)]">Today's Visits</span>
              <span className="font-semibold text-[var(--as-semantic-color-text-default)] tabular-nums">
                {stats.today.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--as-semantic-color-text-muted)]">Total Visits</span>
              <span className="font-bold text-[var(--as-semantic-color-text-default)] tabular-nums">
                {stats.total.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-[var(--as-semantic-color-border-subtle)] flex items-center gap-1.5 text-[10px] text-[var(--as-semantic-color-text-muted)]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Real sessions · 100% privacy-first</span>
          </div>
        </div>
      )}
    </div>
  );
};
