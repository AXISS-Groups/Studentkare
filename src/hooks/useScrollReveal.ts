import { RefObject, useEffect } from 'react';
import '../theme/motion.css';

/** Progressive enhancement: content remains readable before and without observers. */
export function useScrollReveal(root: RefObject<HTMLElement>, revision = '') {
  useEffect(() => {
    const container = root.current;
    if (!container || !('IntersectionObserver' in window)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const elements = Array.from(container.querySelectorAll<HTMLElement>(
      '.shop-section, .shop-carepass, .shop-offer-banners, .shop-movement-invite, .exercise-section, .exercise-bottom-grid',
    ));
    if (preference.matches) return;

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('motion-reveal-visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.05, rootMargin: '0px 0px 30px 0px' });
    for (const element of elements) {
      element.classList.add('motion-reveal-ready');
      observer.observe(element);
    }
    const revealAll = () => {
      if (preference.matches) {
        observer.disconnect();
        for (const element of elements) element.classList.add('motion-reveal-visible');
      }
    };
    preference.addEventListener('change', revealAll);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', revealAll);
      for (const element of elements) element.classList.remove('motion-reveal-ready', 'motion-reveal-visible');
    };
  }, [root, revision]);
}
