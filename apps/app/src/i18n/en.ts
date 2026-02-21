export const en = {
  metadata: {
    title: 'Pluma',
    description: 'Pluma – feature flag management',
  },
  home: {
    heading: 'Welcome to Pluma',
    subheading: 'Your feature flag management system is ready.',
  },
  login: {
    title: 'Sign in to Pluma',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    submitIdle: 'Sign in',
    submitLoading: 'Signing in…',
    footerText: 'Need to set up Pluma?',
    footerLink: 'Register',
    errorFallback: 'Login failed',
    noticeAlreadyConfigured: 'An admin account already exists. Please sign in.',
  },
  register: {
    title: 'Set up Pluma',
    description: 'Create the first admin account to get started.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    submitIdle: 'Create account',
    submitLoading: 'Creating account…',
    footerText: 'Already have an account?',
    footerLink: 'Sign in',
    errorFallback: 'Registration failed',
  },
  notFound: {
    code: '404',
    title: 'Page Not Found',
    description: "The page you're looking for doesn't exist or has been moved.",
    backLink: 'Go back home',
  },
  errors: {
    networkError: 'Unable to reach the server. Check your connection.',
  },
  ui: {
    languageSelectorLabel: 'Language',
  },
} as const;

export type Messages = typeof en;
