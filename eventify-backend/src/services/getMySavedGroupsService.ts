import { prisma } from "../lib/prisma";

export const getMySavedGroupsService = async (telegramUserId: string) => {
    const user = await prisma.user.findUnique({
        where: { telegramId: telegramUserId },
        select: { id: true },
    });
    if (!user) {
        return { groups: [] as { chatId: string; label: string }[] };
    }
    const rows = await prisma.savedGroupChat.findMany({
        where: { userId: user.id },
        orderBy: { chatId: "asc" },
    });
    return {
        groups: rows.map((r) => ({
            chatId: r.chatId,
            label: r.label,
        })),
    };
};
