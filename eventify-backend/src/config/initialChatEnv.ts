/**
 * В Bot API супергруппа/канал задаётся как -100xxxxxxxxxx.
 * Если в .env указали только цифры (например 2349029505), приводим к -1002349029505.
 * Уже отрицательные id и @username не трогаем.
 */
export function normalizeTelegramSupergroupChatId(raw: string): string {
    const s = raw.trim();
    if (s.startsWith("@")) {
        return s;
    }
    if (s.startsWith("-")) {
        return s;
    }
    if (/^\d+$/.test(s)) {
        return `-100${s}`;
    }
    return s;
}

/**
 * Обязательная группа по умолчанию: без INITIAL_CHAT_ID и INITIAL_CHAT_LINK
 * сервер не должен запускаться (см. assertInitialChatEnvOrExit в index).
 */
export function assertInitialChatEnvOrExit(): void {
    const id = process.env.INITIAL_CHAT_ID?.trim();
    const link = process.env.INITIAL_CHAT_LINK?.trim();
    if (!id || !link) {
        console.error(
            "[FATAL] Задайте INITIAL_CHAT_ID и INITIAL_CHAT_LINK в окружении (.env). Без них приложение не запускается.",
        );
        process.exit(1);
    }
}

export function getInitialChatId(): string {
    const id = process.env.INITIAL_CHAT_ID?.trim();
    if (!id) {
        throw new Error(
            "INTERNAL: INITIAL_CHAT_ID отсутствует (нарушен порядок старта приложения).",
        );
    }
    return normalizeTelegramSupergroupChatId(id);
}

/** Сравнение id группы из формы с обязательным (учёт 2349029505 vs -1002349029505). */
export function groupIdsContainSameChat(
    groupIds: string[],
    mandatoryChatId: string,
): boolean {
    const m = normalizeTelegramSupergroupChatId(mandatoryChatId);
    return groupIds.some((g) => normalizeTelegramSupergroupChatId(g) === m);
}

export function getInitialChatLink(): string {
    const link = process.env.INITIAL_CHAT_LINK?.trim();
    if (!link) {
        throw new Error(
            "INTERNAL: INITIAL_CHAT_LINK отсутствует (нарушен порядок старта приложения).",
        );
    }
    return link;
}
