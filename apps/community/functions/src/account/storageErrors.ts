/**
 * True when file storage has never been turned on for the project, so
 * there cannot be any files to remove. Any other failure is a real error.
 */
export const isStorageNotSetUp = (error: unknown): boolean => {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };

  if (code === 404) {
    return true;
  }
  return typeof message === 'string' && message.includes('Bucket name not specified');
};
