import React, { useState } from 'react';
import {
  Image as ImageIcon,
  MapPin,
  Camera,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { MetadataInspectionResult } from '../types/metadata';
import { CleaningOptions } from '../services/imageCleaner';

interface MetadataPanelProps {
  inspection: MetadataInspectionResult;
  onClean: (options: CleaningOptions) => void;
  onReset: () => void;
  isCleaning: boolean;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({
  inspection,
  onClean,
  onReset,
  isCleaning
}) => {
  const { summary, categories, gps, aiProvenance, totalFieldsCount, hasSensitiveData } = inspection;
  const [activeTab, setActiveTab] = useState<'overview' | 'exif' | 'gps' | 'ai' | 'all'>('overview');
  const [outputFormat, setOutputFormat] = useState<'original' | 'image/png' | 'image/jpeg' | 'image/webp'>('original');
  const [quality, setQuality] = useState<number>(0.95);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleStartCleaning = () => {
    onClean({
      format: outputFormat,
      quality: quality
    });
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1800);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      {/* File Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--as-semantic-color-border-subtle)]">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-[var(--as-radius-md)] overflow-hidden border border-[var(--as-semantic-color-border-subtle)] bg-[var(--as-semantic-color-surface-subtle)] shrink-0 flex items-center justify-center">
            {summary.previewUrl ? (
              <img
                src={summary.previewUrl}
                alt={summary.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-[var(--as-semantic-color-text-muted)]" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--as-semantic-color-text-default)] truncate">
              {summary.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--as-semantic-color-text-muted)] font-[var(--as-typography-font-family-mono)] tabular-nums">
              <span>{summary.extension}</span>
              <span aria-hidden="true">·</span>
              <span>{summary.formattedSize}</span>
              <span aria-hidden="true">·</span>
              <span>
                {summary.width} × {summary.height} ({summary.aspectRatio})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="as-button as-button--ghost !h-auto !min-h-[38px] !py-2 !px-3.5 text-xs text-[var(--as-semantic-color-text-muted)] hover:text-[var(--as-semantic-color-status-critical-text)] cursor-pointer transition-colors"
            aria-label="Remove image and upload another"
          >
            <span className="as-button__label !gap-2">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Remove image</span>
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
        {/* Left Column: Preview + Settings (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Image Preview */}
          <div className="as-card overflow-hidden p-0 relative group shadow-sm transition-all duration-300">
            <div className="aspect-[4/3] bg-black/10 dark:bg-black/30 flex items-center justify-center relative overflow-hidden">
              {summary.previewUrl && (
                <img
                  src={summary.previewUrl}
                  alt="Original image preview"
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-[var(--as-typography-font-family-mono)] px-2.5 py-1 rounded-[var(--as-radius-sm)]">
                Uncleaned Original
              </div>
            </div>
            <div className="p-3.5 border-t border-[var(--as-semantic-color-border-subtle)] flex items-center justify-between text-xs text-[var(--as-semantic-color-text-muted)] font-[var(--as-typography-font-family-mono)]">
              <span>{totalFieldsCount} tags embedded</span>
              <span className="tabular-nums">{summary.formattedSize}</span>
            </div>
          </div>

          {/* Cleaning Settings Card */}
          <div className="as-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--as-semantic-color-text-muted)] font-[var(--as-typography-font-family-mono)] mb-4">
              Cleaning Options
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--as-semantic-color-text-muted)] mb-2">
                  Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[var(--as-semantic-color-surface-subtle)] rounded-[var(--as-radius-md)]">
                  {[
                    { label: 'Original', val: 'original' },
                    { label: 'PNG', val: 'image/png' },
                    { label: 'JPEG', val: 'image/jpeg' },
                    { label: 'WebP', val: 'image/webp' }
                  ].map((fmt) => (
                    <button
                      key={fmt.val}
                      type="button"
                      onClick={() => setOutputFormat(fmt.val as any)}
                      className={`py-1.5 text-xs font-[var(--as-typography-font-family-mono)] rounded-[var(--as-radius-sm)] text-center transition-all duration-200 cursor-pointer ${
                        outputFormat === fmt.val
                          ? 'bg-[var(--as-semantic-color-surface-card)] text-[var(--as-semantic-color-text-default)] font-bold shadow-xs'
                          : 'text-[var(--as-semantic-color-text-muted)] hover:text-[var(--as-semantic-color-text-default)]'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {outputFormat !== 'image/png' && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-[var(--as-semantic-color-text-muted)]">
                      Quality
                    </span>
                    <span className="font-[var(--as-typography-font-family-mono)] tabular-nums font-semibold text-[var(--as-semantic-color-text-default)]">
                      {Math.round(quality * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="1.0"
                    step="0.01"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-[var(--as-semantic-color-interactive-primary)] cursor-pointer"
                  />
                </div>
              )}

              {/* Start Cleaning Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartCleaning}
                  disabled={isCleaning}
                  className="as-button as-button--primary w-full justify-center !h-auto !min-h-[46px] !py-3 !px-6 text-sm font-semibold cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] shadow-md flex items-center"
                >
                  <span className="as-button__label !gap-2.5">
                    {isCleaning ? (
                      <>
                        <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                        <span>Cleaning metadata...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Clean Metadata</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Smooth Metadata Inspection (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="as-card p-6">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--as-semantic-color-border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-[var(--as-semantic-color-text-default)]">
                  Embedded Metadata
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-muted)]">
                  {totalFieldsCount} tags detected
                </span>
              </div>
            </div>

            {/* Smooth Tab Strip */}
            <div className="flex items-center gap-1 mt-4 p-1 bg-[var(--as-semantic-color-surface-subtle)] rounded-[var(--as-radius-md)] overflow-x-auto scrollbar-none">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'exif', label: 'EXIF' },
                { id: 'gps', label: 'GPS' },
                { id: 'ai', label: 'AI Provenance' },
                { id: 'all', label: 'All Tags' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[var(--as-radius-sm)] transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-[var(--as-semantic-color-surface-card)] text-[var(--as-semantic-color-text-default)] shadow-xs font-bold'
                      : 'text-[var(--as-semantic-color-text-muted)] hover:text-[var(--as-semantic-color-text-default)]'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'gps' && gps && (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[var(--as-semantic-color-status-warning-text)] inline-block" />
                  )}
                  {tab.id === 'ai' && aiProvenance.detected && (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[var(--as-semantic-color-status-active-text)] inline-block" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="mt-5 space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-[var(--as-radius-md)] bg-[var(--as-semantic-color-surface-subtle)]">
                    <span className="text-[11px] font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-muted)] uppercase block mb-1">
                      Camera
                    </span>
                    <span className="text-xs font-semibold text-[var(--as-semantic-color-text-default)] truncate block">
                      {inspection.rawExif.Make || inspection.rawExif.Model
                        ? `${inspection.rawExif.Make || ''} ${inspection.rawExif.Model || ''}`.trim()
                        : 'None detected'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[var(--as-radius-md)] bg-[var(--as-semantic-color-surface-subtle)]">
                    <span className="text-[11px] font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-muted)] uppercase block mb-1">
                      Coordinates
                    </span>
                    <span className="text-xs font-semibold text-[var(--as-semantic-color-text-default)] truncate block">
                      {gps ? `${gps.formattedLatitude}, ${gps.formattedLongitude}` : 'None detected'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[var(--as-radius-md)] bg-[var(--as-semantic-color-surface-subtle)]">
                    <span className="text-[11px] font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-muted)] uppercase block mb-1">
                      Provenance
                    </span>
                    <span className="text-xs font-semibold text-[var(--as-semantic-color-text-default)] truncate block">
                      {aiProvenance.detected ? aiProvenance.generatorName || 'Detected' : 'Standard Capture'}
                    </span>
                  </div>
                </div>

                {/* Smooth Categories List */}
                <div className="space-y-2 mt-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 rounded-[var(--as-radius-sm)] bg-[var(--as-semantic-color-surface-subtle)] flex items-center justify-between text-xs transition-colors hover:bg-[var(--as-semantic-color-surface-card)]"
                    >
                      <span className="font-medium text-[var(--as-semantic-color-text-default)]">
                        {cat.name}
                      </span>
                      <span className="font-[var(--as-typography-font-family-mono)] tabular-nums text-[var(--as-semantic-color-text-muted)]">
                        {cat.count} tags
                      </span>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="py-8 text-center text-xs text-[var(--as-semantic-color-text-muted)]">
                      No embedded metadata found in this image.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: EXIF */}
            {activeTab === 'exif' && (
              <div className="mt-5 space-y-2 max-h-[380px] overflow-y-auto pr-1 animate-fade-in">
                {categories.find((c) => c.id === 'camera' || c.id === 'timestamps' || c.id === 'software') ? (
                  categories
                    .filter((c) => c.id === 'camera' || c.id === 'timestamps' || c.id === 'software')
                    .flatMap((c) => c.tags)
                    .map((tag, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-[var(--as-radius-sm)] bg-[var(--as-semantic-color-surface-subtle)] flex items-center justify-between text-xs font-[var(--as-typography-font-family-mono)] gap-4"
                      >
                        <span className="text-[var(--as-semantic-color-text-muted)] truncate">{tag.key}</span>
                        <span className="text-[var(--as-semantic-color-text-default)] font-semibold truncate text-right">
                          {tag.value}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="py-8 text-center text-xs text-[var(--as-semantic-color-text-muted)]">
                    No EXIF tags detected.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: GPS */}
            {activeTab === 'gps' && (
              <div className="mt-5 space-y-4 animate-fade-in">
                {gps ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-[var(--as-radius-md)] bg-[var(--as-semantic-color-surface-subtle)] space-y-2">
                      <div className="flex items-center justify-between text-xs font-[var(--as-typography-font-family-mono)]">
                        <span className="text-[var(--as-semantic-color-text-muted)]">Latitude</span>
                        <span className="font-semibold text-[var(--as-semantic-color-text-default)]">{gps.formattedLatitude}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-[var(--as-typography-font-family-mono)]">
                        <span className="text-[var(--as-semantic-color-text-muted)]">Longitude</span>
                        <span className="font-semibold text-[var(--as-semantic-color-text-default)]">{gps.formattedLongitude}</span>
                      </div>
                      {gps.altitude && (
                        <div className="flex items-center justify-between text-xs font-[var(--as-typography-font-family-mono)]">
                          <span className="text-[var(--as-semantic-color-text-muted)]">Altitude</span>
                          <span className="font-semibold text-[var(--as-semantic-color-text-default)]">{gps.altitude.toFixed(1)} m</span>
                        </div>
                      )}
                    </div>

                    <a
                      href={gps.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="as-button as-button--secondary !h-auto !min-h-[40px] !py-2.5 !px-4 text-xs w-full justify-center flex items-center cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
                    >
                      <span className="as-button__label !gap-2">
                        <ExternalLink className="w-4 h-4 shrink-0 text-sky-400" />
                        <span>View on Google Maps</span>
                      </span>
                    </a>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[var(--as-semantic-color-text-muted)]">
                    No GPS location metadata detected.
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: AI Provenance */}
            {activeTab === 'ai' && (
              <div className="mt-5 space-y-4 animate-fade-in">
                {aiProvenance.detected ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-[var(--as-radius-md)] bg-[var(--as-semantic-color-surface-subtle)]">
                      <span className="text-[11px] font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-muted)] uppercase block mb-1">
                        Generator
                      </span>
                      <span className="text-xs font-bold text-[var(--as-semantic-color-text-default)]">
                        {aiProvenance.generatorName}
                      </span>
                    </div>

                    {aiProvenance.prompts && (
                      <div className="p-3.5 rounded-[var(--as-radius-md)] bg-[var(--as-semantic-color-surface-subtle)] relative group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-muted)] uppercase">
                            Extracted Prompt
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(aiProvenance.prompts!)}
                            className="text-xs px-2.5 py-1.5 rounded-[var(--as-radius-sm)] bg-[var(--as-semantic-color-surface-card)] border border-[var(--as-semantic-color-border-subtle)] text-[var(--as-semantic-color-text-muted)] hover:text-[var(--as-semantic-color-text-default)] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedPrompt ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="text-[11px] font-mono">{copiedPrompt ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="text-xs font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-default)] leading-relaxed whitespace-pre-wrap break-words">
                          {aiProvenance.prompts}
                        </p>
                      </div>
                    )}

                    {aiProvenance.parameters && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {Object.entries(aiProvenance.parameters).map(([pk, pv], i) => (
                          <div
                            key={i}
                            className="p-2 rounded-[var(--as-radius-sm)] bg-[var(--as-semantic-color-surface-subtle)] flex items-center justify-between text-xs font-[var(--as-typography-font-family-mono)]"
                          >
                            <span className="text-[var(--as-semantic-color-text-muted)]">{pk}</span>
                            <span className="text-[var(--as-semantic-color-text-default)] font-semibold">{pv}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[var(--as-semantic-color-text-muted)]">
                    No AI generation records or C2PA signatures detected.
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: All Raw Tags */}
            {activeTab === 'all' && (
              <div className="mt-5 space-y-1.5 max-h-[380px] overflow-y-auto pr-1 animate-fade-in">
                {categories.flatMap((c) => c.tags).map((tag, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-[var(--as-radius-sm)] bg-[var(--as-semantic-color-surface-subtle)] flex items-center justify-between text-xs font-[var(--as-typography-font-family-mono)] gap-4 hover:bg-[var(--as-semantic-color-surface-card)] transition-colors"
                  >
                    <span className="text-[var(--as-semantic-color-text-muted)] truncate w-2/5">{tag.key}</span>
                    <span className="text-[var(--as-semantic-color-text-default)] truncate text-right w-3/5">
                      {tag.value}
                    </span>
                  </div>
                ))}
                {totalFieldsCount === 0 && (
                  <div className="py-8 text-center text-xs text-[var(--as-semantic-color-text-muted)]">
                    0 raw tags.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
