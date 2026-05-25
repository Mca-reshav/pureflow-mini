export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BM' | 'ANALYST';
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface NavigationItem {
  label: string;
  href: string;
  icon: string;
}

export interface Permissions {
  'project.create': boolean;
  'project.viewAll': boolean;
  'project.addMember': boolean;
  'task.create': boolean;
  'task.assign': boolean;
  'expected_hours.read': boolean;
  'time.log': boolean;
  'time.editOwn': boolean;
  'report.export': boolean;
  'admin.users': boolean;
  'audit.read': boolean;
  'capacity.team': boolean;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BM' | 'ANALYST';
  status: string;
  navigation: NavigationItem[];
  permissions: Permissions;
  unreadNotificationCount: number;
}


export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}


export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'BM' | 'ANALYST';
}

export interface UpdateUserPayload {
  name?: string;
  role?: 'ADMIN' | 'BM' | 'ANALYST';
  status?: 'active' | 'inactive';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'role'>;
}