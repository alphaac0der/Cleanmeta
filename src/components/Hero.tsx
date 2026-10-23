import React, { useRef, useState, useEffect } from 'react';
import { Upload, ShieldCheck, Image as ImageIcon, Sparkles, MapPin, AlertCircle } from 'lucide-react';
import { createSampleFile } from '../services/sampleImages';

interface HeroProps {
  onFileSelected: (file: File) => void;
  isLoadingSample: boolean;
  onSetLoadingSample: (loading: boolean) => void;
  errorMessage: string | null;
  onClearError: () => void;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const Hero: React.FC<HeroProps> = ({
  onFileSelected,
  isLoadingSample,
  onSetLoadingSample,
  errorMessage,
  onClearError
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for tilt & smooth inside colors
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0, time: Date.now() });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    // Calculate cursor velocity for smooth micro-shake reaction
    const now = Date.now();
    const dt = Math.max(now - lastMousePos.current.time, 16);
    const vx = (x - lastMousePos.current.x) / dt;
    const vy = (y - lastMousePos.current.y) / dt;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > 1.2) {
      setShake({
        x: Math.min(Math.max(vx * 1.5, -3), 3),
        y: Math.min(Math.max(vy * 1.5, -3), 3)
      });
    }

    lastMousePos.current = { x, y, time: now };

    // Normalized coordinates (-1 to 1) from center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const normX = (x - centerX) / centerX;
    const normY = (y - centerY) / centerY;

    setTilt({
      x: -normY * 4,
      y: normX * 4
    });
  };

  // Dampen shake over time
  useEffect(() => {
    if (shake.x !== 0 || shake.y !== 0) {
      const timer = setTimeout(() => {
        setShake({ x: 0, y: 0 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    setShake({ x: 0, y: 0 });
  };

  const validateAndHandleFile = (file: File) => {
    setLocalError(null);
    onClearError();

    // Check size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 20 MB limit.`);
      return;
    }

    // Check type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isSupported =
      SUPPORTED_EXTENSIONS.includes(ext) ||
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);

    if (!isSupported) {
      setLocalError(`Unsupported file format. Please upload JPG, PNG, or WebP.`);
      return;
    }

    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  const handleLoadSample = async (type: 'street_gps' | 'ai_synthesis') => {
    try {
      onSetLoadingSample(true);
      setLocalError(null);
      const sampleFile = await createSampleFile(type);
      validateAndHandleFile(sampleFile);
    } catch (err: any) {
      setLocalError('Failed to load sample image: ' + err.message);
    } finally {
      onSetLoadingSample(false);
    }
  };

  const activeError = errorMessage || localError;

  return (
    <section className="py-12 md:py-20 max-w-4xl mx-auto px-6 text-center animate-fade-in relative">
      {/* Eyebrow */}
      <div className="inline-flex items-center gap-2 mb-4 group cursor-default">
        <span className="text-xs font-[var(--as-typography-font-family-mono)] font-semibold tracking-wider uppercase text-[var(--as-semantic-color-text-muted)] transition-colors group-hover:text-[var(--as-semantic-color-text-default)]">
          FREE IMAGE UTILITY
        </span>
      </div>

      {/* Heading in Aster DS Display font */}
      <h1
        style={{ fontFamily: 'var(--as-typography-font-family-display)' }}
        className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-wide uppercase text-[var(--as-semantic-color-text-default)] mb-4 text-balance leading-[0.92] select-none"
      >
        Your images. Your metadata.
      </h1>

      {/* Description */}
      <p className="text-base sm:text-lg text-[var(--as-semantic-color-text-muted)] max-w-xl mx-auto mb-10 sm:mb-12 leading-relaxed font-normal">
        Inspect and clean image metadata in seconds.
      </p>

      {/* Glass Upload Box Container */}
      <div className="relative max-w-2xl mx-auto perspective-[1000px]">
        {/* The Glass Box (Solid border, overflow-hidden keeps all subtle colors strictly inside) */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            transform: isHovering
              ? `perspective(1000px) rotateX(${tilt.x + shake.y}deg) rotateY(${tilt.y + shake.x}deg) translateY(-2px)`
              : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
            transition: isHovering
              ? 'transform 0.08s ease-out, box-shadow 0.3s ease, border-color 0.3s ease'
              : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease'
          }}
          className={`relative rounded-[var(--as-radius-lg)] p-6 sm:p-10 md:p-14 cursor-pointer text-center select-none overflow-hidden backdrop-blur-2xl transition-all duration-300 ${
            isDragOver
              ? 'bg-white/[0.06] dark:bg-white/[0.04] border border-[var(--as-semantic-color-border-focus)] shadow-[0_16px_36px_rgba(0,0,0,0.5),0_0_20px_rgba(100,181,246,0.25)] scale-[1.01]'
              : 'bg-white/[0.03] dark:bg-white/[0.02] border border-white/12 dark:border-white/10 hover:border-white/25 dark:hover:border-white/20 shadow-[0_16px_36px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload image to inspect and clean metadata"
        >
          {/* Subtle inside ambient color washes: Red + touch of Sky + minimal Purple (very faint, clipped inside) */}
          <div
            className="absolute -top-12 -left-12 w-56 h-56 rounded-full bg-rose-600/[0.07] dark:bg-rose-500/[0.08] blur-2xl pointer-events-none transition-transform duration-500 ease-out"
            style={{
              transform: `translate(${tilt.y * -2.5}px, ${tilt.x * -2.5}px)`
            }}
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full bg-red-500/[0.06] dark:bg-rose-600/[0.06] blur-2xl pointer-events-none transition-transform duration-500 ease-out"
            style={{
              transform: `translate(${tilt.y * 2}px, ${tilt.x * 2}px)`
            }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-sky-500/[0.04] dark:bg-sky-400/[0.04] blur-2xl pointer-events-none transition-transform duration-700 ease-out"
            style={{
              transform: `translate(${tilt.y * -1.5}px, ${tilt.x * -1.5}px)`
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-purple-600/[0.025] blur-2xl pointer-events-none transition-transform duration-700 ease-out"
            aria-hidden="true"
          />

          {/* Smooth cursor-following spotlight sheen inside the glass */}
          {isHovering && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(340px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.05), transparent 70%)`
              }}
              aria-hidden="true"
            />
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />

          {/* Content inside the glass box */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-[var(--as-radius-full)] bg-white/10 dark:bg-white/5 border border-white/15 flex items-center justify-center text-[var(--as-semantic-color-text-default)] group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300 shadow-inner">
              <Upload className="w-7 h-7 stroke-[1.75]" />
            </div>

            <div>
              <p className="text-base sm:text-lg font-semibold text-[var(--as-semantic-color-text-default)] mb-1.5">
                Drag and drop your image here, or{' '}
                <span className="underline underline-offset-4 decoration-white/40 group-hover:decoration-white transition-colors">
                  browse
                </span>
              </p>
              <p className="text-xs font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-muted)]">
                Supports JPG, PNG, and WebP up to 20 MB
              </p>
            </div>

            <div className="mt-2">
              <div
                className="as-button as-button--primary !h-auto !min-h-[42px] !py-2.5 !px-6 pointer-events-none shadow-md inline-flex items-center justify-center"
              >
                <span className="as-button__label text-sm font-semibold">Choose image</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {activeError && (
        <div className="mt-5 as-alert as-alert--critical flex items-center gap-3 text-left max-w-xl mx-auto animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-[var(--as-semantic-color-status-critical-text)]" />
          <div className="text-xs font-medium">{activeError}</div>
        </div>
      )}

      {/* Privacy note */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--as-semantic-color-text-muted)]">
        <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--as-semantic-color-status-success-text)]" />
        <span>100% browser-local processing. No images leave your device.</span>
      </div>

      {/* Sample Test Files */}
      <div className="mt-10 pt-8 border-t border-[var(--as-semantic-color-border-subtle)]">
        <p className="text-xs font-medium text-[var(--as-semantic-color-text-muted)] mb-3.5">
          No photo ready? Test with sample files:
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-xl mx-auto px-2">
          <button
            type="button"
            disabled={isLoadingSample}
            onClick={() => handleLoadSample('street_gps')}
            className="as-button as-button--secondary !h-auto !min-h-[42px] !py-2.5 !px-5 cursor-pointer w-full sm:w-auto hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm flex items-center justify-center"
          >
            <span className="as-button__label !gap-2.5 text-xs font-medium">
              <MapPin className="w-4 h-4 shrink-0 text-sky-400" />
              <span>{isLoadingSample ? 'Loading...' : 'Sample Photo (Camera EXIF + GPS)'}</span>
            </span>
          </button>

          <button
            type="button"
            disabled={isLoadingSample}
            onClick={() => handleLoadSample('ai_synthesis')}
            className="as-button as-button--secondary !h-auto !min-h-[42px] !py-2.5 !px-5 cursor-pointer w-full sm:w-auto hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm flex items-center justify-center"
          >
            <span className="as-button__label !gap-2.5 text-xs font-medium">
              <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
              <span>{isLoadingSample ? 'Loading...' : 'Sample AI Art (SDXL + Prompts + C2PA)'}</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
