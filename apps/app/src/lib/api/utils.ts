/**
 * Attempts to parse a structured error message from a non-OK API response.
 * Accepts both `{ message: string }` and `{ error: string }` response shapes.
 * Falls back to the provided fallback string if parsing fails.
 */
export async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const msg = (data as Record<string, unknown>).message;
      if (typeof msg === 'string') return msg;
      const err = (data as Record<string, unknown>).error;
      if (typeof err === 'string') return err;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
