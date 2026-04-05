/**
 * Коды ошибок авторизации (initData / заголовок) для API и мини-приложения.
 * Совпадают со строками на фронте.
 */
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

const MESSAGES: Record<AuthErrorCode, string> = {
    AUTH_HEADER_MISSING:
        'Нет заголовка авторизации. Откройте приложение из Telegram.',
    AUTH_AUTH_TYPE_UNSUPPORTED:
        'Неподдерживаемый тип авторизации. Откройте приложение из Telegram.',
    INIT_DATA_EXPIRED:
        'Время сессии истекло. Закройте мини-приложение и откройте его снова из чата с ботом.',
    INIT_DATA_AUTH_DATE_INVALID:
        'Некорректная дата в данных Telegram. Попробуйте открыть приложение снова.',
    INIT_DATA_SIGNATURE_INVALID:
        'Подпись данных не совпадает с ботом. Откройте приложение из Telegram.',
    INIT_DATA_SIGNATURE_MISSING:
        'В данных нет подписи. Откройте приложение из Telegram.',
    INIT_DATA_HASH_INVALID: 'Некорректный формат подписи в данных.',
    INIT_DATA_PARSE_ERROR:
        'Не удалось разобрать данные Telegram. Откройте приложение снова.',
    INIT_DATA_VALIDATION_UNKNOWN:
        'Не удалось проверить данные Telegram. Откройте приложение снова.',
};

export function createAuthError(code: AuthErrorCode, overrideMessage?: string): Error {
    const err = new Error(overrideMessage ?? MESSAGES[code]);
    (err as Error & { authCode: AuthErrorCode }).authCode = code;
    return err;
}

/** Маппинг ошибок @tma.js/init-data-node и прочих к коду ответа */
export function mapInitDataValidationError(err: unknown): {
    code: AuthErrorCode;
    error: string;
} | null {
    if (!err || typeof err !== 'object') return null;
    const e = err as { name?: string; authCode?: AuthErrorCode; message?: string };
    if (e.authCode && MESSAGES[e.authCode]) {
        return { code: e.authCode, error: e.message ?? MESSAGES[e.authCode] };
    }
    const name = e.name;
    switch (name) {
        case 'ExpiredError':
            return { code: 'INIT_DATA_EXPIRED', error: MESSAGES.INIT_DATA_EXPIRED };
        case 'AuthDateInvalidError':
            return {
                code: 'INIT_DATA_AUTH_DATE_INVALID',
                error: MESSAGES.INIT_DATA_AUTH_DATE_INVALID,
            };
        case 'SignatureInvalidError':
            return {
                code: 'INIT_DATA_SIGNATURE_INVALID',
                error: MESSAGES.INIT_DATA_SIGNATURE_INVALID,
            };
        case 'SignatureMissingError':
            return {
                code: 'INIT_DATA_SIGNATURE_MISSING',
                error: MESSAGES.INIT_DATA_SIGNATURE_MISSING,
            };
        case 'HexStringLengthInvalidError':
            return { code: 'INIT_DATA_HASH_INVALID', error: MESSAGES.INIT_DATA_HASH_INVALID };
        default:
            return null;
    }
}

export function messageForCode(code: AuthErrorCode): string {
    return MESSAGES[code];
}

export function isAuthErrorCode(code: string): code is AuthErrorCode {
    return code in MESSAGES;
}
