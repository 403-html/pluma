'use client';

import { type ReactNode } from 'react';

type ModalProps = {
  titleId: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ titleId, title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
      aria-hidden="true"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <div
        className="bg-background rounded-lg p-6 w-full max-w-sm shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-xl font-semibold mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}
