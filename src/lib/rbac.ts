/**
 * Role-Based Access Control (RBAC) Utilities
 * Provides authorization checks for different user roles
 */

import { UserRole } from '@/types/data-models';

export const ROLES = {
  PUBLIC: 'public' as UserRole,
  CLIENT: 'client' as UserRole,
  STAFF: 'staff' as UserRole,
  ADMIN: 'admin' as UserRole,
};

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  public: 0,
  client: 1,
  staff: 2,
  admin: 3,
};

/**
 * Check if a role has at least the required level
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a role is exactly the specified role
 */
export function isRole(userRole: UserRole, targetRole: UserRole): boolean {
  return userRole === targetRole;
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === ROLES.ADMIN;
}

/**
 * Check if user is staff or higher
 */
export function isStaff(userRole: UserRole): boolean {
  return hasRole(userRole, ROLES.STAFF);
}

/**
 * Check if user is client
 */
export function isClient(userRole: UserRole): boolean {
  return userRole === ROLES.CLIENT;
}

/**
 * Permission definitions for different resources
 */
export interface PermissionCheck {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'list';
  role: UserRole;
  ownerId?: string;
  userId?: string;
  clientId?: string;
  orgId?: string;
}

/**
 * Check if a user has permission to perform an action on a resource
 */
export function hasPermission(check: PermissionCheck): boolean {
  const { resource, action, role, ownerId, userId, clientId } = check;

  // Admin has all permissions
  if (isAdmin(role)) {
    return true;
  }

  // Staff permissions
  if (isStaff(role)) {
    switch (resource) {
      case 'user':
        return action !== 'delete'; // Staff can read, update, but not delete users
      case 'org':
        return action === 'read' || action === 'update'; // Staff can read and update org
      case 'member':
        return action === 'read' || action === 'list'; // Staff can read members
      case 'client':
      case 'lead':
      case 'company':
      case 'contact':
      case 'opportunity':
      case 'activity':
      case 'proposal':
      case 'project':
      case 'deliverable':
      case 'risk':
      case 'decision':
      case 'document':
      case 'knowledge':
        return true; // Staff has full access to operational resources
      default:
        return false;
    }
  }

  // Client permissions
  if (isClient(role)) {
    const isOwnResource = ownerId === userId;
    const hasClientAccess = !!(clientId && clientId === userId);

    switch (resource) {
      case 'user':
        return action === 'read' && isOwnResource; // Can only read own profile
      case 'proposal':
        return (action === 'read' || action === 'list') && hasClientAccess;
      case 'project':
        return (action === 'read' || action === 'list') && hasClientAccess;
      case 'deliverable':
        return ['read', 'list', 'update'].includes(action) && hasClientAccess; // Can approve/reject
      case 'document':
        return (action === 'read' || action === 'list') && hasClientAccess;
      case 'request':
        return ['create', 'read', 'list', 'update'].includes(action) && hasClientAccess;
      case 'status-report':
        return (action === 'read' || action === 'list') && hasClientAccess;
      default:
        return false;
    }
  }

  // Public has no permissions
  return false;
}

/**
 * Get allowed resources for a role
 */
export function getAllowedResources(role: UserRole): string[] {
  if (isAdmin(role)) {
    return ['*']; // All resources
  }

  if (isStaff(role)) {
    return [
      'user', 'org', 'member', 'client',
      'lead', 'company', 'contact', 'opportunity', 'activity',
      'proposal', 'project', 'deliverable',
      'risk', 'decision', 'document', 'knowledge',
      'proof', 'dashboard'
    ];
  }

  if (isClient(role)) {
    return ['user', 'proposal', 'project', 'deliverable', 'document', 'request', 'status-report'];
  }

  return [];
}

/**
 * Route access control
 */
export interface RouteAccess {
  path: string;
  allowedRoles: UserRole[];
  requireAuth: boolean;
}

export const ROUTE_ACCESS: RouteAccess[] = [
  // Public routes
  { path: '/', allowedRoles: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: false },
  { path: '/login', allowedRoles: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: false },
  { path: '/signup', allowedRoles: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: false },
  { path: '/contact', allowedRoles: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: false },
  { path: '/services', allowedRoles: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: false },
  { path: '/approach', allowedRoles: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: false },
  { path: '/case-studies', allowedRoles: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: false },
  { path: '/reviews', allowedRoles: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: false },
  { path: '/share/:token', allowedRoles: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: false },
  
  // Client routes
  { path: '/dashboard', allowedRoles: [ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/projects', allowedRoles: [ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/projects/:id', allowedRoles: [ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/documents', allowedRoles: [ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/requests', allowedRoles: [ROLES.CLIENT, ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  
  // Staff routes
  { path: '/crm', allowedRoles: [ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/leads', allowedRoles: [ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/companies', allowedRoles: [ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/contacts', allowedRoles: [ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/opportunities', allowedRoles: [ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/proposals', allowedRoles: [ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/proposals/new', allowedRoles: [ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/knowledge', allowedRoles: [ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  { path: '/operational-dashboard', allowedRoles: [ROLES.STAFF, ROLES.ADMIN], requireAuth: true },
  
  // Admin routes
  { path: '/settings', allowedRoles: [ROLES.ADMIN], requireAuth: true },
  { path: '/members', allowedRoles: [ROLES.ADMIN], requireAuth: true },
  { path: '/clients', allowedRoles: [ROLES.ADMIN], requireAuth: true },
  { path: '/audit-logs', allowedRoles: [ROLES.ADMIN], requireAuth: true },
];

/**
 * Check if user can access a route
 */
export function canAccessRoute(path: string, role: UserRole, isAuthenticated: boolean): boolean {
  // Find matching route (support simple wildcard matching)
  const route = ROUTE_ACCESS.find(r => {
    const pattern = r.path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });

  if (!route) {
    // If route is not defined, default to requiring authentication and staff role
    return isAuthenticated && isStaff(role);
  }

  // Check authentication requirement
  if (route.requireAuth && !isAuthenticated) {
    return false;
  }

  // Check role access
  return route.allowedRoles.includes(role);
}

/**
 * Get redirect path for unauthorized access
 */
export function getUnauthorizedRedirect(isAuthenticated: boolean, role?: UserRole): string {
  if (!isAuthenticated) {
    return '/login';
  }

  // If authenticated but not authorized, redirect based on role
  if (role === ROLES.CLIENT) {
    return '/dashboard';
  }

  if (isStaff(role!)) {
    return '/crm';
  }

  return '/';
}
