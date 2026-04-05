import { prisma } from "../lib/prisma";

/** Сохраняет подписи к ID чатов для пользователя (при создании/редактировании события). */
export async function upsertUserSavedGroupLabels(
    userId: number,
    groupIds: string[],
    groupLabels: Record<string, string> | undefined,
): Promise<void> {
    const unique = [...new Set(groupIds.map((x) => String(x).trim()).filter(Boolean))];
    for (const chatId of unique) {
        const label = (groupLabels?.[chatId] ?? "").trim();
        await prisma.savedGroupChat.upsert({
            where: {
                userId_chatId: { userId, chatId },
            },
            create: { userId, chatId, label },
            update: { label },
        });
    }
}

export async function getGroupLabelsForCreator(
    creatorId: number,
    groupIds: string[],
): Promise<{ chatId: string; label: string }[]> {
    if (groupIds.length === 0) return [];
    const rows = await prisma.savedGroupChat.findMany({
        where: {
            userId: creatorId,
            chatId: { in: groupIds },
        },
    });
    const byId = new Map(rows.map((r) => [r.chatId, r.label]));
    return groupIds.map((chatId) => ({
        chatId,
        label: (byId.get(chatId) ?? "").trim(),
    }));
}
