/**
 * Attempts to parse a structured error message from a non-OK API response.
 * Falls back to the provided fallback string if parsing fails.
 */
export async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}
