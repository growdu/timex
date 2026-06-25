export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh' | 'license';
  iat?: number;
  exp?: number;
}

export interface AccessTokenPayload extends JwtPayload {
  type: 'access';
}

export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
}

export interface LicenseTokenPayload extends JwtPayload {
  type: 'license';
  licenseId: string;
  planType: string;
}
