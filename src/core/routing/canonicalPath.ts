/**
 * The one spelling of an app path. React Router matches `/ADMIN/` to the `/admin`
 * route, so the role guard passed, but the shell and screens read the raw path
 * and fell back to the shop for any other spelling.
 *
 * Repeated slashes collapse and a trailing slash goes (except on the root). Fixed
 * segments take the spelling of the registered route they match, ignoring case.
 * Parameter segments are kept exactly as given: a parameter may be
 * case-sensitive (an id, a token), so it is never lower-cased here. Newsroom
 * slugs are lower case by construction (SLUG_PATTERN in PostsAdminViewModel);
 * `/Blog/Exam-Stress/` becomes `/blog/Exam-Stress`, and the newsroom decides
 * whether that slug names a post.
 * A path no route matches keeps its case; the catch-all route deals with it.
 */
export function canonicalPathname(pathname: string, patterns: readonly string[]): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  const path = (collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed) || '/';
  const got = path.split('/');
  const isParam = (part: string) => part.startsWith(':');
  const matches = patterns
    .map((pattern) => pattern.split('/'))
    .filter((want) => want.length === got.length && want.every((part, i) => {
      const segment = got[i] ?? '';
      return isParam(part) ? segment !== '' : part.toLowerCase() === segment.toLowerCase();
    }));
  // A fixed route wins over a parameter route that also matches (`/blog/featured`
  // over `/blog/:slug`), as React Router ranks them.
  const best = matches.sort((a, b) => a.filter(isParam).length - b.filter(isParam).length)[0];
  return best ? best.map((part, i) => (isParam(part) ? got[i] ?? '' : part)).join('/') : path;
}
