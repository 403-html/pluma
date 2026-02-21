import { en } from './en';

export type { Messages } from './en';

/** Returns the flat messages object for the active locale (English only for now). */
export function getMessages() {
  return en;
}

export { en };
