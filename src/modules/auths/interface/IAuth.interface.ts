export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  accessToken: string;
}

export interface IUserAuthResponse {
  id: string;
  name: string;
  email: string;
  birthDate: Date;
  phone: string;
  username: string;
  password?: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    birthDate?: Date;
    username?: string;
    phone?: string;
    role: string;
  };
}

export interface AuthCodeData {
  token: string;
  userId: string;
  expiresAt: number;
}
