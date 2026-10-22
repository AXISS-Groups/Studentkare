import React, { Suspense, lazy } from 'react';
import { ScreenLoading } from '@/components/health/ScreenLoading';

const NewsroomListPage = lazy(() => import('../views/NewsroomListPage').then((m) => ({ default: m.NewsroomListPage })));
const PostPage = lazy(() => import('../views/PostPage').then((m) => ({ default: m.PostPage })));

/** /blog: health tips and stories (public). */
export function BlogScreen(): React.ReactElement {
  return <Suspense fallback={<ScreenLoading />}><NewsroomListPage section="blog" /></Suspense>;
}

/** /news: what's new, campus news and press releases (public). */
export function NewsScreen(): React.ReactElement {
  return <Suspense fallback={<ScreenLoading />}><NewsroomListPage section="news" /></Suspense>;
}

/** /blog/:slug (public). */
export function BlogPostScreen(): React.ReactElement {
  return <Suspense fallback={<ScreenLoading />}><PostPage section="blog" /></Suspense>;
}

/** /news/:slug (public). */
export function NewsPostScreen(): React.ReactElement {
  return <Suspense fallback={<ScreenLoading />}><PostPage section="news" /></Suspense>;
}
