# @pluma/app

Next.js 16 UI for Pluma feature flag management.

## Development

### Start the dev server

```bash
pnpm dev
```

Runs the Next.js development server on port 3000 (default).

### Build for production

```bash
pnpm build
```

Generates an optimized production build.

### Lint

```bash
pnpm lint
```

Runs ESLint on the codebase.

## Environment Variables

Create a `.env.local` file (or copy from `.env.example`):

```bash
cp .env.example .env.local
```

### Required variables

- `NEXT_PUBLIC_API_URL` - Base URL of the Pluma API server (e.g., `http://localhost:3001`)

This variable is validated at build time and must be set before starting the dev server or building.

## Internationalisation

The app uses a custom i18n system with locale-based routing.

### How the i18n system works

- All user-facing strings live in `src/i18n/en.ts` as a typed `as const` object
- `src/i18n/index.ts` exposes:
  - `SUPPORTED_LOCALES` - array of supported locale codes
  - `DEFAULT_LOCALE` - fallback locale (currently `'en'`)
  - `Locale` - TypeScript type for valid locale codes
  - `isValidLocale(value: string)` - type guard to check if a string is a valid locale
  - `resolveLocale(lang: string)` - resolves a raw route param to a valid `Locale`, falling back to `DEFAULT_LOCALE`; used by every page so locale validation lives in one place
  - `getDictionary(locale: Locale)` - returns the messages object for the given locale
- `src/i18n/LocaleContext.tsx` provides a React context for client components:
  - `<LocaleProvider locale={locale}>` - wraps the root layout body; resolved once server-side
  - `useLocale()` - returns `{ locale, t }` from context; use in any client component instead of prop drilling `lang`/`t`
- `src/components/LanguageSwitcher.tsx` - fixed top-left selector; reads the current locale from context and navigates to the same path under the new locale; hidden when only one locale is configured
- All pages live under `src/app/[lang]/` - the `[lang]` segment is the locale code (e.g., `/en/login`)
- The proxy (`src/proxy.ts`) detects the locale from the `Accept-Language` header and redirects bare URLs (e.g., `/login`) to locale-prefixed URLs (e.g., `/en/login`)

### How to add a new language

#### 1. Create a new translation file

Copy `src/i18n/en.ts` and translate all values. The constant name must match the locale code.

Example for French (`fr`):

```ts
// src/i18n/fr.ts
export const fr = {
  metadata: {
    title: 'Pluma',
    description: 'Pluma – gestion des feature flags',
  },
  home: {
    heading: 'Bienvenue sur Pluma',
    subheading: 'Votre système de gestion des feature flags est prêt.',
  },
  login: {
    title: 'Se connecter à Pluma',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'vous@exemple.com',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '••••••••',
    submitIdle: 'Se connecter',
    submitLoading: 'Connexion en cours…',
    footerText: 'Besoin de configurer Pluma ?',
    footerLink: 'Créer un compte',
    errorFallback: 'Échec de la connexion',
    noticeAlreadyConfigured: 'Un compte administrateur existe déjà. Veuillez vous connecter.',
  },
  register: {
    title: 'Configurer Pluma',
    description: 'Créez le premier compte administrateur pour commencer.',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'vous@exemple.com',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '••••••••',
    submitIdle: 'Créer le compte',
    submitLoading: 'Création du compte…',
    footerText: 'Vous avez déjà un compte ?',
    footerLink: 'Se connecter',
    errorFallback: 'Échec de la création du compte',
  },
  notFound: {
    code: '404',
    title: 'Page non trouvée',
    description: "La page que vous recherchez n'existe pas ou a été déplacée.",
    backLink: "Retour à l'accueil",
  },
  errors: {
    networkError: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
  },
  ui: {
    languageSelectorLabel: 'Langue',
  },
  common: {
    loading: 'Chargement…',
  },
} as const;
```

#### 2. Register the locale in `src/i18n/index.ts`

Import the new messages object:

```ts
import { fr } from './fr';
```

Add the locale code to `SUPPORTED_LOCALES`:

```ts
export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
```

Add an entry to the `dictionaries` map:

```ts
const dictionaries: Record<Locale, typeof en> = { en, fr };
```

Full updated `src/i18n/index.ts`:

```ts
import { en } from './en';
import { fr } from './fr';

export type { Messages } from './en';

export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, typeof en> = { en, fr };

export function isValidLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Resolves a raw route param to a valid Locale, falling back to DEFAULT_LOCALE. */
export function resolveLocale(lang: string): Locale {
  return isValidLocale(lang) ? lang : DEFAULT_LOCALE;
}

/** Returns the messages object for the given locale. */
export function getDictionary(locale: Locale): typeof en {
  return dictionaries[locale];
}

export { en, fr };
```

#### 3. Done

The proxy auto-detects the locale from `Accept-Language` and `generateStaticParams` picks it up automatically. No further configuration is needed.

### How to edit an existing translation

- Open `src/i18n/<locale>.ts` (e.g., `src/i18n/en.ts`)
- Change the string values as needed
- The TypeScript `as const` type ensures every key is always present - if a key is missing, the build will fail with a type error
- Key names must **not** be renamed or removed without updating every reference in the codebase (`getDictionary()` is fully typed, so TypeScript will surface any broken references at compile time)

### Translation key reference

| Key group | Used in |
|---|---|
| `metadata` | `<head>` title and description |
| `home` | Home page (`/`) |
| `login` | Login form (`/login`) |
| `register` | Register form (`/register`) |
| `notFound` | 404 page |
| `errors` | API error messages (network failures, etc.) |
| `ui` | UI components (language switcher, etc.) |
