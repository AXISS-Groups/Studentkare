/** Role → web portal path. Native Expo tabs are not used on web. */
export function portalPathForRole(role?: string | null): string {
  const r = String(role || '').toLowerCase();
  if (r === 'admin' || r === 'super_admin') return '/super-admin';
  if (r === 'college') return '/college-portal';
  if (r === 'mentor') return '/mentor-portal';
  if (r === 'alumni') return '/alumni-portal';
  return '/student-portal';
}

export function rolesForPortal(portal: 'student' | 'alumni' | 'mentor' | 'college' | 'admin'): string[] {
  if (portal === 'admin') return ['admin', 'super_admin'];
  if (portal === 'college') return ['college'];
  if (portal === 'mentor') return ['mentor'];
  if (portal === 'alumni') return ['alumni'];
  return ['student'];
}

export function displayName(user: any, empty = 'Account'): string {
  if (!user) return empty;
  const full = String(user.full_name || '').trim();
  if (full) return full;
  const parts = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  if (user.name) return String(user.name);
  if (user.email) return String(user.email);
  return empty;
}

export function displayInitials(user: any): string {
  const name = displayName(user, '');
  const parts = name.split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (name) return name.slice(0, 2).toUpperCase();
  return '•';
}
