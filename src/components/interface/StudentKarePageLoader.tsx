import { useEffect } from 'react';

export function StudentKarePageLoader({
  onComplete,
}: {
  onComplete?: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  return null;
}
