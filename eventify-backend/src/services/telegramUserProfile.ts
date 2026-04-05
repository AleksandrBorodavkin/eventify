/** Ссылка для открытия чата с пользователем в Telegram. */
export function buildTelegramUserContactLink(
    telegramId: string,
    username: string | null,
): string {
    const u = username?.trim();
    if (u) {
        return `https://t.me/${u.replace(/^@/, "")}`;
    }
    return `tg://user?id=${telegramId}`;
}
