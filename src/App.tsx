import React, { useEffect, useState } from 'react';
import { initAsterComponents } from 'aster-ds';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MetadataPanel } from './components/MetadataPanel';
import { ComparisonView } from './components/ComparisonView';
import { HowItWorksDialog } from './components/HowItWorksDialog';
import { Footer } from './components/Footer';
import { CleanReport, MetadataInspectionResult, ProcessingState } from './types/metadata';
import { inspectImageMetadata } from './services/metadataInspector';
import { cleanImageMetadata, CleaningOptions } from './services/imageCleaner';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [inspectionResult, setInspectionResult] = useState<MetadataInspectionResult | null>(null);
  const [cleanReport, setCleanReport] = useState<CleanReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Initialize theme from document or preference (default dark)
  useEffect(() => {
    const savedTheme = localStorage.getItem('cleanmeta-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  // Initialize Aster DS behaviors (button ripple/origin tracking, accessibility hooks)
  useEffect(() => {
    try {
      initAsterComponents(document);
    } catch (err) {
      console.warn('Aster DS initialization note:', err);
    }
  }, [processingState]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('cleanmeta-theme', nextTheme);
  };

  // Inspect image on file selection
  const handleFileSelected = async (file: File) => {
    try {
      setErrorMessage(null);
      setProcessingState('inspecting');

      // Cleanup prior URLs if present
      if (inspectionResult?.summary.previewUrl) {
        URL.revokeObjectURL(inspectionResult.summary.previewUrl);
      }
      if (cleanReport?.cleanedUrl) {
        URL.revokeObjectURL(cleanReport.cleanedUrl);
      }

      setCleanReport(null);

      // Perform real metadata inspection
      const result = await inspectImageMetadata(file);
      setInspectionResult(result);
      setProcessingState('inspected');
    } catch (err: any) {
      console.error('Error inspecting metadata:', err);
      setErrorMessage(err.message || 'Failed to inspect image metadata.');
      setProcessingState('error');
    }
  };

  // Clean image metadata with chosen settings
  const handleClean = async (options: CleaningOptions) => {
    if (!inspectionResult) return;

    try {
      setProcessingState('cleaning');
      setErrorMessage(null);

      const report = await cleanImageMetadata(inspectionResult, options);
      setCleanReport(report);
      setProcessingState('cleaned');
    } catch (err: any) {
      console.error('Error cleaning metadata:', err);
      setErrorMessage(err.message || 'Failed to clean image metadata.');
      setProcessingState('error');
    }
  };

  const handleReset = () => {
    if (inspectionResult?.summary.previewUrl) {
      URL.revokeObjectURL(inspectionResult.summary.previewUrl);
    }
    if (cleanReport?.cleanedUrl) {
      URL.revokeObjectURL(cleanReport.cleanedUrl);
    }
    setInspectionResult(null);
    setCleanReport(null);
    setErrorMessage(null);
    setProcessingState('idle');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--as-semantic-color-surface-canvas)] text-[var(--as-semantic-color-text-default)] transition-colors duration-200">
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
      />

      <main className="flex-1 flex flex-col">
        {/* State 1: Idle (Hero & Upload) */}
        {processingState === 'idle' && (
          <Hero
            onFileSelected={handleFileSelected}
            isLoadingSample={isLoadingSample}
            onSetLoadingSample={setIsLoadingSample}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          />
        )}

        {/* State 2: Inspecting Loading State */}
        {processingState === 'inspecting' && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto min-h-[50vh]">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--as-semantic-color-border-strong)] border-t-[var(--as-semantic-color-interactive-primary)] animate-spin mb-4" />
            <h2 className="text-lg font-bold text-[var(--as-semantic-color-text-default)] mb-1">
              Extracting Image Headers
            </h2>
            <p className="text-xs font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-muted)]">
              Inspecting EXIF, GPS coordinates, XMP packets, and AI provenance records...
            </p>
          </div>
        )}

        {/* State 3: Cleaning in Progress */}
        {processingState === 'cleaning' && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto min-h-[50vh]">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--as-semantic-color-border-strong)] border-t-[var(--as-semantic-color-status-success-text)] animate-spin mb-4" />
            <h2 className="text-lg font-bold text-[var(--as-semantic-color-text-default)] mb-1">
              Normalizing & Stripping Metadata
            </h2>
            <p className="text-xs font-[var(--as-typography-font-family-mono)] text-[var(--as-semantic-color-text-muted)]">
              Re-encoding pixel canvas locally and verifying complete removal...
            </p>
          </div>
        )}

        {/* State 4: Inspected Results View */}
        {processingState === 'inspected' && inspectionResult && (
          <MetadataPanel
            inspection={inspectionResult}
            onClean={handleClean}
            onReset={handleReset}
            isCleaning={false}
          />
        )}

        {/* State 5: Cleaned Comparison & Download View */}
        {processingState === 'cleaned' && inspectionResult && cleanReport && (
          <ComparisonView
            originalInspection={inspectionResult}
            report={cleanReport}
            onReset={handleReset}
          />
        )}

        {/* State 6: Error View */}
        {processingState === 'error' && (
          <div className="max-w-xl mx-auto px-6 py-16 text-center my-auto">
            <div className="as-alert as-alert--critical p-6 flex flex-col items-center gap-3 mb-6">
              <AlertCircle className="w-8 h-8 text-[var(--as-semantic-color-status-critical-text)]" />
              <h3 className="text-base font-bold text-[var(--as-semantic-color-status-critical-text)]">
                Processing Error
              </h3>
              <p className="text-xs text-[var(--as-semantic-color-text-default)]">
                {errorMessage || 'An unexpected error occurred while processing the image.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="as-button as-button--primary !h-auto !min-h-[42px] !py-2.5 !px-6 cursor-pointer"
            >
              <span className="as-button__label">Try another file</span>
            </button>
          </div>
        )}
      </main>

      <Footer onOpenHowItWorks={() => setIsHowItWorksOpen(true)} />

      {/* Accessible Aster DS How It Works Modal */}
      <HowItWorksDialog
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
}
