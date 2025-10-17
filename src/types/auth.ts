export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isApproved: boolean;
  isActive: boolean;
  dhanClientId?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface UserSession {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
}

export interface UserAuditLog {
  id: number;
  userId?: number;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (userData: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
}
