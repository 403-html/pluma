import { verifyPassword } from './password.js';

const DEFAULT_ADMIN_EMAIL = 'admin@pluma.local';
const DEFAULT_ADMIN_PASSWORD = 'pluma-admin';
let warnedDefaults = false;

export type AdminIdentity = {
  userId: string;
  email: string;
  role: 'admin';
};

type AdminConfig = AdminIdentity & {
  password?: string;
  passwordHash?: string;
};

export const getAdminConfig = (): AdminConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  const envEmail = process.env.ADMIN_EMAIL;
  const envPassword = process.env.ADMIN_PASSWORD;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const email = envEmail ?? (isProduction ? undefined : DEFAULT_ADMIN_EMAIL);
  const password = envPassword ?? (isProduction ? undefined : DEFAULT_ADMIN_PASSWORD);

  if (!isProduction && !warnedDefaults && (!envEmail || (!envPassword && !passwordHash))) {
    warnedDefaults = true;
    console.warn('Using default admin credentials. Set ADMIN_EMAIL and ADMIN_PASSWORD.');
  }

  if (!email || (!passwordHash && !password)) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD or ADMIN_PASSWORD_HASH are required');
  }

  return {
    userId: email,
    email,
    role: 'admin',
    password,
    passwordHash,
  };
};

export const verifyAdminCredentials = (email: string, password: string) => {
  const config = getAdminConfig();

  if (email !== config.email) {
    return false;
  }

  if (config.passwordHash) {
    return verifyPassword(password, config.passwordHash);
  }

  if (!config.password) {
    return false;
  }

  return verifyPassword(password, config.password);
};
