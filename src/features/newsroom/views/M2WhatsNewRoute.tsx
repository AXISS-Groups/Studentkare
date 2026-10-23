import React from 'react';
import { useNavigate } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { M2WhatsNewView } from './M2WhatsNewView';

/** /whats-new for a signed-in student: in the phone frame, or above phone width in the student web shell. */
export function M2WhatsNewRoute({ wide = false }: { wide?: boolean }): React.ReactElement {
  const routerNavigate = useNavigate();
  return (
    <M2WhatsNewView wide={wide} links={{
      back: () => (window.history.length > 1 ? window.history.back() : navigate('profile')),
      open: (post) => routerNavigate(post.path),
      allNews: () => routerNavigate('/news'),
    }} />
  );
}
