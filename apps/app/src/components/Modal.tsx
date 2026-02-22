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
      className="modal-overlay"
      aria-hidden="true"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
