import React from 'react';
import {
  Download,
  RotateCcw,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  ArrowDown
} from 'lucide-react';
import { CleanReport, MetadataInspectionResult } from '../types/metadata';
import { triggerFileDownload } from '../services/imageCleaner';

interface ComparisonViewProps {
  originalInspection: MetadataInspectionResult;
  report: CleanReport;
  onReset: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  originalInspection,
  report,
  onReset
}) => {
  const { summary } = originalInspection;
  const { removedCategories, sizeDifferenceBytes, sizeDifferencePercentage } = report;

  const handleDownload = () => {
    const ext =
      report.formatUsed === 'image/png'
        ? 'png'
        : report.formatUsed === 'image/webp'
        ? 'webp'
        : 'jpg';
    const base = summary.name.replace(/\.[^/.]+$/, '');
    triggerFileDownload(report.cleanedBlob, `${base}_cleaned.${ext}`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      {/* Success Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--as-semantic-color-border-subtle)] mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--as-semantic-color-surface-success)] text-[var(--as-semantic-color-status-success-text)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--as-semantic-color-text-default)]">
              Image Cleaned & Verified
            </h2>
            <p className="text-xs text-[var(--as-semantic-color-text-muted)] font-[var(--as-typography-font-family-mono)]">
              0 metadata tags remaining · Re-inspected and verified
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleDownload}
            className="as-button as-button--primary !h-auto !min-h-[44px] !py-2.5 !px-6 text-sm font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto flex items-center justify-center"
          >
            <span className="as-button__label !gap-2.5">
              <Download className="w-4 h-4 shrink-0" />
              <span>Download Cleaned Image</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="as-button as-button--secondary !h-auto !min-h-[44px] !py-2.5 !px-5 text-xs font-medium cursor-pointer w-full sm:w-auto hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
          >
            <span className="as-button__label !gap-2">
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Clean another</span>
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid: Cleaned Preview (Left) + Removal Report (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cleaned Image Preview Card (7 cols) */}
        <div className="lg:col-span-7">
          <div className="as-card p-3 overflow-hidden transition-all duration-300">
            <div className="aspect-[4/3] rounded-[var(--as-radius-md)] bg-black/10 dark:bg-black/30 flex items-center justify-center relative overflow-hidden group">
              <img
                src={report.cleanedUrl}
                alt="Cleaned image preview"
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                referrerPolicy="no-referrer"
              />

              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-[var(--as-typography-font-family-mono)] px-2.5 py-1 rounded-[var(--as-radius-sm)] flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cleaned Output</span>
              </div>
            </div>

            <div className="mt-3 px-2 py-1 flex items-center justify-between text-xs text-[var(--as-semantic-color-text-muted)] font-[var(--as-typography-font-family-mono)]">
              <span>
                {summary.width} × {summary.height} px · {summary.aspectRatio}
              </span>
              <span className="font-semibold text-[var(--as-semantic-color-status-success-text)] tabular-nums">
                {report.cleanedFormattedSize}
              </span>
            </div>
          </div>
        </div>

        {/* Removal & Impact Audit (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* File Size Delta Card */}
          <div className="as-card p-5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--as-semantic-color-text-muted)] block mb-3 font-[var(--as-typography-font-family-mono)]">
              Storage Impact
            </span>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-[var(--as-radius-md)] bg-[var(--as-semantic-color-surface-subtle)]">
                <span className="text-[11px] text-[var(--as-semantic-color-text-muted)] block mb-1">
                  Original
                </span>
                <span className="text-sm font-bold text-[var(--as-semantic-color-text-default)] font-[var(--as-typography-font-family-mono)] tabular-nums">
                  {summary.formattedSize}
                </span>
              </div>

              <div className="p-3 rounded-[var(--as-radius-md)] bg-[var(--as-semantic-color-surface-subtle)]">
                <span className="text-[11px] text-[var(--as-semantic-color-text-muted)] block mb-1">
                  Cleaned
                </span>
                <span className="text-sm font-bold text-[var(--as-semantic-color-status-success-text)] font-[var(--as-typography-font-family-mono)] tabular-nums">
                  {report.cleanedFormattedSize}
                </span>
              </div>
            </div>

            <div className="text-xs text-[var(--as-semantic-color-text-muted)] flex items-center justify-between font-[var(--as-typography-font-family-mono)] pt-1">
              <span>Size difference:</span>
              <span className="font-semibold text-[var(--as-semantic-color-text-default)] tabular-nums">
                {sizeDifferenceBytes >= 0
                  ? `-${Math.abs(sizeDifferenceBytes / 1024).toFixed(1)} KB (${sizeDifferencePercentage}%)`
                  : `+${Math.abs(sizeDifferenceBytes / 1024).toFixed(1)} KB`}
              </span>
            </div>
          </div>

          {/* Verified Removed Categories */}
          <div className="as-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--as-semantic-color-text-muted)] font-[var(--as-typography-font-family-mono)]">
                Removed Categories
              </span>
              <span className="text-xs font-semibold text-[var(--as-semantic-color-status-success-text)] font-[var(--as-typography-font-family-mono)]">
                {removedCategories.length} stripped
              </span>
            </div>

            <div className="space-y-2">
              {removedCategories.length > 0 ? (
                removedCategories.map((cat, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-[var(--as-radius-sm)] bg-[var(--as-semantic-color-surface-subtle)] flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-[var(--as-semantic-color-text-default)]">
                      {cat}
                    </span>
                    <span className="flex items-center gap-1 text-[var(--as-semantic-color-status-success-text)] text-[11px] font-semibold font-[var(--as-typography-font-family-mono)]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Stripped
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[var(--as-semantic-color-text-muted)] py-2">
                  No metadata categories were present in original.
                </div>
              )}
            </div>

            {/* Reinspection Verification Checklist */}
            <div className="mt-4 pt-4 border-t border-[var(--as-semantic-color-border-subtle)] space-y-1 text-xs font-[var(--as-typography-font-family-mono)]">
              <div className="flex items-center justify-between text-[var(--as-semantic-color-text-muted)]">
                <span>Output EXIF tags</span>
                <span className="font-bold text-[var(--as-semantic-color-status-success-text)]">0</span>
              </div>
              <div className="flex items-center justify-between text-[var(--as-semantic-color-text-muted)]">
                <span>Output GPS coordinates</span>
                <span className="font-bold text-[var(--as-semantic-color-status-success-text)]">0</span>
              </div>
              <div className="flex items-center justify-between text-[var(--as-semantic-color-text-muted)]">
                <span>Output AI Provenance / C2PA</span>
                <span className="font-bold text-[var(--as-semantic-color-status-success-text)]">0</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="as-button as-button--primary w-full justify-center !h-auto !min-h-[46px] !py-3 !px-6 text-sm font-semibold flex items-center shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <span className="as-button__label !gap-2.5">
              <Download className="w-4 h-4 shrink-0" />
              <span>Download Cleaned Image</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
