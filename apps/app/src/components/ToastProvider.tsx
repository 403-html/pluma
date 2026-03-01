'use client';

import { ToastContainer } from 'react-toastify';

interface ToastProviderProps {
  ariaLabel?: string;
}

export function ToastProvider({ ariaLabel }: ToastProviderProps) {
  return (
    <ToastContainer
      aria-label={ariaLabel}
      position="bottom-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
    />
  );
}
