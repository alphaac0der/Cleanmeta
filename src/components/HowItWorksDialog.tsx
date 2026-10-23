import React, { useEffect, useRef } from 'react';
import { X, ShieldCheck, MapPin, Sparkles, Layers, Cpu } from 'lucide-react';

interface HowItWorksDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksDialog: React.FC<HowItWorksDialogProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={handleBackdropClick}
      className="as-dialog !max-w-[min(92vw,540px)] w-[92vw] sm:w-full"
    >
      <div className="as-dialog__surface">
        {/* Header with red circular close control */}
        <div className="as-dialog__header">
          <span className="as-dialog__title">Cleanmeta Guide</span>
          <button
            type="button"
            onClick={onClose}
            className="as-dialog__close w-6 h-6 rounded-full flex items-center justify-center text-[var(--as-semantic-color-text-muted)] hover:text-[var(--as-semantic-color-text-default)] hover:bg-[var(--as-semantic-color-surface-subtle)] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="as-dialog__hero">
          <h2 className="as-dialog__hero-title">HOW IT WORKS</h2>
          <p className="as-dialog__hero-subtitle">
            Local metadata inspection and stripping engine
          </p>
        </div>

        {/* Body Content */}
        <div className="as-dialog__body !max-h-[380px] space-y-5">
          {/* Section 1: What is in an image */}
          <div className="space-y-2">
            <h3 className="as-dialog__section-title flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--as-semantic-color-status-focus-text)]" />
              1. What images silently carry
            </h3>
            <p className="text-xs text-[var(--as-semantic-color-text-muted)] leading-relaxed">
              When photos are captured or generated, image files store invisible metadata headers alongside visual pixels:
            </p>
            <ul className="text-xs text-[var(--as-semantic-color-text-default)] space-y-1.5 pl-4 list-disc">
              <li>
                <strong>Camera EXIF:</strong> Device make, model, lens, serial numbers, aperture, ISO, and capture timestamps.
              </li>
              <li>
                <strong>GPS Coordinates:</strong> Exact latitude, longitude, and altitude identifying where you took the photo.
              </li>
              <li>
                <strong>AI Provenance & Prompts:</strong> Generators (Stable Diffusion, Midjourney, ComfyUI, DALL-E) embed the exact prompt text, seeds, and model workflows into comments, XMP, and PNG text chunks.
              </li>
              <li>
                <strong>Content Credentials (C2PA):</strong> Digital cryptographic signatures indicating editing history and provenance.
              </li>
            </ul>
          </div>

          {/* Section 2: How Cleanmeta strips it */}
          <div className="space-y-2 pt-2 border-t border-[var(--as-semantic-color-border-subtle)]">
            <h3 className="as-dialog__section-title flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--as-semantic-color-status-success-text)]" />
              2. 100% Browser-Local Cleaning
            </h3>
            <p className="text-xs text-[var(--as-semantic-color-text-muted)] leading-relaxed">
              Cleanmeta decodes the image pixels onto an isolated in-memory canvas. During this process:
            </p>
            <ul className="text-xs text-[var(--as-semantic-color-text-default)] space-y-1.5 pl-4 list-disc">
              <li>
                Every metadata block (APP1, APP13, XMP, IPTC, ICC, C2PA) is completely discarded.
              </li>
              <li>
                EXIF orientation is normalized physically so rotated smartphone photos remain right-side up.
              </li>
              <li>
                PNG transparency is preserved lossless.
              </li>
              <li>
                No bytes leave your computer; your images are never uploaded to any remote server or third-party service.
              </li>
            </ul>
          </div>

          {/* Section 3: Social platform boundaries */}
          <div className="space-y-2 pt-2 border-t border-[var(--as-semantic-color-border-subtle)]">
            <h3 className="as-dialog__section-title flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--as-semantic-color-status-warning-text)]" />
              3. Important Platform Notice
            </h3>
            <p className="text-xs text-[var(--as-semantic-color-text-muted)] leading-relaxed">
              Removing file metadata strips all embedded tags and digital manifest records. However, social media platforms (like Instagram, TikTok, and YouTube) also use independent perceptual watermarking (e.g. SynthID) and computer vision classifiers that analyze the visual pixels themselves. Removing metadata does not guarantee that social platforms will remove their automated AI labels.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--as-semantic-color-border-subtle)] bg-[var(--as-semantic-color-surface-subtle)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="as-button as-button--primary !h-auto !min-h-[38px] !py-2 !px-5 text-xs font-semibold cursor-pointer"
          >
            <span className="as-button__label">Understood</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};
