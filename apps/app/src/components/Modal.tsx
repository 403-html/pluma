'use client';

import { type ReactNode } from 'react';

type ModalProps = {
  titleId: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'lg';
};

export default function Modal({ titleId, title, onClose, children, size = 'sm' }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <div
        className={`bg-card border border-border rounded-lg p-6 w-full shadow-2xl max-h-[90vh] overflow-y-auto ${size === 'lg' ? 'max-w-2xl' : 'max-w-sm'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-xl font-semibold text-foreground mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}
