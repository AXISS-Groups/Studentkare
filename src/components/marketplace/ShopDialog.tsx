import React, { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function ShopDialog({ title, onClose, children, wide = false }: {
  title: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return <dialog ref={ref} className={`shop shop-dialog ${wide ? 'shop-dialog-wide' : ''}`} aria-labelledby={titleId} onCancel={onClose}>
    <div className="shop-dialog-header"><h2 id={titleId}>{title}</h2><button className="shop-icon-button" onClick={onClose} aria-label="Close dialog"><X size={21} /></button></div>
    <div className="shop-dialog-body">{children}</div>
  </dialog>;
}
