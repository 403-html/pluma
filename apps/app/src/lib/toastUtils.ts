/** Renders the error message from a thrown Error for use in `toast.promise` error options. */
export function toastErrorRender({ data }: { data: unknown }): string {
  return data instanceof Error ? data.message : String(data);
}
