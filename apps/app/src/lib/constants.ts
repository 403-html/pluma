/** Cookie name used to persist the user's chosen theme. */
export const THEME_COOKIE_NAME = 'pluma-theme';

/** Max-age (seconds) for the theme cookie — 1 year. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Character length of an ISO UTC date string (YYYY-MM-DD). */
export const ISO_DATE_LENGTH = 10;

/**
 * Offset into an ISO date string (YYYY-MM-DD) past the "YYYY-" prefix (5 chars),
 * leaving MM-DD for axis labels.
 */
export const ISO_DATE_LABEL_OFFSET = 5;

/** Pixel height of the chart container. */
export const CHART_HEIGHT = 200;

/** Font size (px) for axis tick labels. */
export const CHART_FONT_SIZE = 12;

/** Top-corner border radius of each bar (bottom stays square). */
export const BAR_CORNER_RADIUS = 4;
