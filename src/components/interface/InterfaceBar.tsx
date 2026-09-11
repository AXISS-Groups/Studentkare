import React, { useEffect, useRef } from 'react';
import { ChevronDown, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useInterface } from '../../theme/InterfaceProvider';

export function InterfaceBar({ section }: { section: string }) {
  const { reducedMotion, systemReducedMotion, setReducedMotion } = useInterface();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent | KeyboardEvent) => {
      const isEscape = event instanceof KeyboardEvent && event.key === 'Escape';
      if (isEscape || (event instanceof PointerEvent && !root.current?.contains(event.target as Node))) {
        root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu => {
          menu.open = false;
          if (isEscape) menu.querySelector<HTMLElement>('summary')?.focus();
        });
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, []);

  return <div className="care-interface-bar" ref={root}>
    <span className="care-workspace-label"><Sparkles size={12} />Studentkare <span>/</span><strong>{section}</strong></span>
    <div className="care-interface-actions">
      <details className="care-toolbar-menu"><summary><SlidersHorizontal size={13} /><span>Display settings</span><ChevronDown size={11} /></summary><div className="care-settings-panel"><strong>A calmer interface, your way.</strong><label><input type="checkbox" checked={reducedMotion} disabled={systemReducedMotion} onChange={event => setReducedMotion(event.target.checked)} /><span>Reduce interface motion</span></label><p>{systemReducedMotion ? 'Your device requests reduced motion. That preference is respected across every screen.' : 'Turn off decorative animation and transitions across all pages. Your choice is remembered on this device.'}</p></div></details>
    </div>
  </div>;
}
