/** Совпадает с `AuthErrorCode` на бэкенде */
export type AuthErrorCode =
  | 'AUTH_HEADER_MISSING'
  | 'AUTH_AUTH_TYPE_UNSUPPORTED'
  | 'INIT_DATA_EXPIRED'
  | 'INIT_DATA_AUTH_DATE_INVALID'
  | 'INIT_DATA_SIGNATURE_INVALID'
  | 'INIT_DATA_SIGNATURE_MISSING'
  | 'INIT_DATA_HASH_INVALID'
  | 'INIT_DATA_PARSE_ERROR'
  | 'INIT_DATA_VALIDATION_UNKNOWN';

export const AUTH_ERROR_EVENT = 'eventyfy:auth-error';

export type AuthErrorPayload = {
  code: AuthErrorCode | string;
  message: string;
};

export function dispatchAuthError(payload: AuthErrorPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT, { detail: payload }));
}

export class AuthApiError extends Error {
  readonly code: AuthErrorCode | string;

  constructor(code: AuthErrorCode | string, message: string) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
  }
}

export function isAuthApiError(e: unknown): e is AuthApiError {
  return e instanceof AuthApiError;
}
