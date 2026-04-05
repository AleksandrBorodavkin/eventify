import { prisma } from "../lib/prisma";

/** Единый include для выборок события с группами (меньше дублирования в сервисах). */
export const prismaSavedGroupLinksInclude = {
    orderBy: { sortOrder: "asc" as const },
    include: { savedGroupChat: true },
};

type SavedLinkWithLabel = {
    sortOrder: number;
    savedGroupChat: { chatId: string; label: string };
};

export type ApiEventGroup = { chatId: string; label: string };

/** Ответ API: убрать savedGroupLinks, добавить groups (каноничная форма). */
export function eventRowWithGroups<
    E extends { savedGroupLinks: SavedLinkWithLabel[] },
>(e: E): Omit<E, "savedGroupLinks"> & { groups: ApiEventGroup[] } {
    const { savedGroupLinks, ...rest } = e;
    return {
        ...(rest as Omit<E, "savedGroupLinks">),
        groups: publicGroupsFromSavedLinks(savedGroupLinks).groups,
    };
}

/** Публичные группы события из связей Prisma. */
export function publicGroupsFromSavedLinks(links: SavedLinkWithLabel[]): {
    groups: ApiEventGroup[];
} {
    const sorted = [...links].sort((a, b) => a.sortOrder - b.sortOrder);
    return {
        groups: sorted.map((l) => ({
            chatId: l.savedGroupChat.chatId,
            label: l.savedGroupChat.label,
        })),
    };
}

/** Уникальные chatId в порядке первого вхождения. */
export function uniqueChatIdsPreserveOrder(raw: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of raw) {
        const t = String(id).trim();
        if (!t || seen.has(t)) continue;
        seen.add(t);
        out.push(t);
    }
    return out;
}

export function groupChatIdsFromEventLinks(
    links: { sortOrder: number; savedGroupChat: { chatId: string } }[],
): string[] {
    return [...links]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((l) => l.savedGroupChat.chatId);
}

/**
 * После upsert в SavedGroupChat — id строк в том же порядке, что orderedChatIds.
 */
export async function resolveSavedGroupChatIdsForCreator(
    creatorId: number,
    orderedChatIds: string[],
): Promise<number[]> {
    const order = uniqueChatIdsPreserveOrder(orderedChatIds);
    if (order.length === 0) {
        return [];
    }
    const rows = await prisma.savedGroupChat.findMany({
        where: { userId: creatorId, chatId: { in: order } },
    });
    const byChat = new Map(rows.map((r) => [r.chatId, r.id]));
    return order.map((cid) => {
        const id = byChat.get(cid);
        if (id === undefined) {
            throw new Error(
                `Внутренняя ошибка: нет SavedGroupChat для chatId=${cid} после upsert`,
            );
        }
        return id;
    });
}
