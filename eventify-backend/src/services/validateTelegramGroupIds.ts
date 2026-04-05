import { normalizeTelegramSupergroupChatId } from "../config/initialChatEnv";
import { bot } from "../bot";

/** Код для клиента (мини-приложение); совпадает с фронтом. */
export const TELEGRAM_GROUP_IDS_INVALID_CODE = "TELEGRAM_GROUP_IDS_INVALID" as const;

export class InvalidTelegramChatIdsError extends Error {
    readonly code = TELEGRAM_GROUP_IDS_INVALID_CODE;
    readonly invalidIds: string[];

    constructor(invalidIds: string[]) {
        const list = invalidIds.join(", ");
        super(
            `Для бота недоступны чаты с ID: ${list}. Проверьте ID и что бот добавлен в эту группу.`,
        );
        this.name = "InvalidTelegramChatIdsError";
        this.invalidIds = invalidIds;
    }
}

/**
 * Проверяет, что Bot API видит каждый чат ({@link getChat}).
 * Иначе сохранённый id бессмыслен для проверки участников.
 */
export async function assertGroupIdsExistForBot(
    rawGroupIds: string[],
): Promise<void> {
    const unique = [
        ...new Set(rawGroupIds.map((x) => String(x).trim()).filter(Boolean)),
    ];
    if (unique.length === 0) {
        return;
    }

    const checks = await Promise.all(
        unique.map(async (raw) => {
            const chatParam = normalizeTelegramSupergroupChatId(raw);
            try {
                await bot.api.getChat(chatParam);
                return { raw, ok: true as const };
            } catch {
                return { raw, ok: false as const };
            }
        }),
    );

    const invalid = checks.filter((c) => !c.ok).map((c) => c.raw);
    if (invalid.length > 0) {
        throw new InvalidTelegramChatIdsError(invalid);
    }
}
