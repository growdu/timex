interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  licenseTokenExpiresIn: string;
}

export const jwtConfig: JwtConfig = {
  secret: process.env.JWT_SECRET || 'default-secret-change-me',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  licenseTokenExpiresIn: process.env.LICENSE_TOKEN_EXPIRES_IN || '24h',
};
