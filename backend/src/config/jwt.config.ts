import type { StringValue } from 'ms';

interface JwtConfig {
  secret: string;
  expiresIn: StringValue;
  refreshExpiresIn: StringValue;
  licenseTokenExpiresIn: StringValue;
}

export const jwtConfig: JwtConfig = {
  secret: process.env.JWT_SECRET || 'default-secret-change-me',
  expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as StringValue,
  refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
  licenseTokenExpiresIn: (process.env.LICENSE_TOKEN_EXPIRES_IN ||
    '24h') as StringValue,
};
