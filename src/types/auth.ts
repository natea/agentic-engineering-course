export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
  };
}

export interface RefreshResponse {
  accessToken: string;
}

export interface TokenPayload {
  userId: number;
  email: string;
}

export interface RefreshTokenPayload {
  userId: number;
}
