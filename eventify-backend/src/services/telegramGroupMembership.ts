import { bot } from "../bot";

const IN_CHAT_STATUSES = new Set([
    "creator",
    "administrator",
    "member",
    "restricted",
]);

/**
 * Проверяет, состоит ли пользователь в чате/группе (по данным Bot API).
 */
export async function isTelegramUserInChat(
    telegramUserId: number,
    chatId: string,
): Promise<boolean> {
    try {
        const member = await bot.api.getChatMember(chatId, telegramUserId);
        return IN_CHAT_STATUSES.has(member.status);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[getChatMember]", {
            chatId,
            telegramUserId,
            error: msg,
        });
        return false;
    }
}
