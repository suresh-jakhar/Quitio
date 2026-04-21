export interface AuthUser {
  user_id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface SignupPayload {
  email: string;
  password: string;
}

export interface SigninPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user_id: string;
  email: string;
  token: string;
}
