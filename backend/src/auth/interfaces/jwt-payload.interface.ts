export interface JwtPayload {
  sub: string; // User ID
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}



