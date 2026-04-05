/** Совпадает с `TELEGRAM_GROUP_IDS_INVALID_CODE` на бэкенде */
export const TELEGRAM_GROUP_IDS_INVALID_CODE = 'TELEGRAM_GROUP_IDS_INVALID' as const;

export class TelegramGroupIdsInvalidError extends Error {
  readonly code = TELEGRAM_GROUP_IDS_INVALID_CODE;
  readonly invalidGroupIds: string[];

  constructor(message: string, invalidGroupIds: string[]) {
    super(message);
    this.name = 'TelegramGroupIdsInvalidError';
    this.invalidGroupIds = invalidGroupIds;
  }
}

export function isTelegramGroupIdsInvalidError(
  e: unknown,
): e is TelegramGroupIdsInvalidError {
  return e instanceof TelegramGroupIdsInvalidError;
}
