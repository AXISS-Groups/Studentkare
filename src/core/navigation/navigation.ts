// Platform navigation facade.
//
// This module is the ONLY place the codebase imports `react-router-dom`.
// Feature modules and screens never import a router directly; they use these
// primitives. On native the implementation can be swapped for React Navigation
// (NavigationContainer + stack/tab) without touching any feature code — only
// this facade changes.
//
// Re-exported router primitives (web implementation):
export {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
export type { Location, NavigateFunction } from 'react-router-dom';
