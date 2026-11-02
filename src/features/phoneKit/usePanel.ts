import { useEffect, useState } from 'react';

/** Opens a web panel under the board and scrolls it into view. */
export function usePanel(): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) document.querySelector('[id^="board-panel-"]')?.scrollIntoView({ block: 'start' });
  }, [open]);
  return [open, () => setOpen(true)];
}
