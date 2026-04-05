import { prisma } from "../lib/prisma";
import { canUserViewEvent } from "./eventVisibilityService";
import {
    eventRowWithGroups,
    groupChatIdsFromEventLinks,
    prismaSavedGroupLinksInclude,
} from "./eventSavedGroupLinks";

export const getAllEventsForViewer = async (viewerTelegramId: number) => {
    const events = await prisma.event.findMany({
        orderBy: {
            date: "desc",
        },
        include: {
            creator: { select: { telegramId: true } },
            savedGroupLinks: prismaSavedGroupLinksInclude,
            UserEvent: {
                include: {
                    user: { select: { telegramId: true } },
                },
            },
        },
    });

    const viewerTelegramIdStr = String(viewerTelegramId);
    const result: unknown[] = [];
    for (const e of events) {
        const groupIds = groupChatIdsFromEventLinks(e.savedGroupLinks);
        const ok = await canUserViewEvent(
            viewerTelegramId,
            {
                creatorTelegramId: e.creator.telegramId,
                groupIds,
            },
            `GET /events/all eventId=${e.id}`,
        );
        if (!ok) continue;

        const mainParticipantsTotal = e.UserEvent.reduce(
            (sum, ue) => sum + ue.mainParticipantsCount,
            0,
        );
        const reserveParticipantsTotal = e.UserEvent.reduce(
            (sum, ue) => sum + ue.reserveParticipantsCount,
            0,
        );
        const isParticipant = e.UserEvent.some(
            (ue) =>
                ue.user.telegramId === viewerTelegramIdStr &&
                ue.mainParticipantsCount + ue.reserveParticipantsCount > 0,
        );

        const { UserEvent: _ue, ...eventWithoutUserEvents } = e;
        const { creator: _c, ...row } = eventRowWithGroups(eventWithoutUserEvents);
        result.push({
            ...row,
            mainParticipantsTotal,
            reserveParticipantsTotal,
            isParticipant,
        });
    }
    return result;
};
