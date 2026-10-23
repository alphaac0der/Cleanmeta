import React from 'react';

interface FooterProps {
  onOpenHowItWorks: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenHowItWorks }) => {
  return (
    <footer className="w-full border-t border-[var(--as-semantic-color-border-subtle)] bg-[var(--as-semantic-color-surface-canvas)] py-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--as-semantic-color-text-muted)] font-[var(--as-typography-font-family-mono)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--as-semantic-color-text-default)]">Cleanmeta</span>
          <span aria-hidden="true">·</span>
          <span>
            Created by{' '}
            <a
              href="https://irtizakhanlabib.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--as-semantic-color-text-default)] hover:underline decoration-white/40 transition-colors"
            >
              Irtiza Khan Labib
            </a>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onOpenHowItWorks}
            className="hover:text-[var(--as-semantic-color-text-default)] transition-colors cursor-pointer"
          >
            How it works
          </button>
          <span className="tabular-nums">100% Client-Side Privacy</span>
        </div>
      </div>
    </footer>
  );
};
