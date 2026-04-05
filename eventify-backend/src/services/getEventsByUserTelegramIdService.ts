import { prisma } from "../lib/prisma";
import { canUserViewEvent } from "./eventVisibilityService";
import {
    eventRowWithGroups,
    groupChatIdsFromEventLinks,
    prismaSavedGroupLinksInclude,
} from "./eventSavedGroupLinks";

export const getEventsByUserTelegramIdService = async (telegramId: string) => {
    const viewerTelegramId = Number(telegramId);
    const events = await prisma.event.findMany({
        include: {
            UserEvent: {
                include: {
                    user: true,
                },
            },
            creator: { select: { telegramId: true } },
            savedGroupLinks: prismaSavedGroupLinksInclude,
        },
    });

    const result = [];
    for (const event of events) {
        const groupIds = groupChatIdsFromEventLinks(event.savedGroupLinks);
        const ok = await canUserViewEvent(
            viewerTelegramId,
            {
                creatorTelegramId: event.creator.telegramId,
                groupIds,
            },
            `GET /events eventId=${event.id}`,
        );
        if (!ok) continue;

        const isParticipant = event.UserEvent.some(
            (userEvent: { user: { telegramId: string }; mainParticipantsCount: number; reserveParticipantsCount: number }) =>
                userEvent.user.telegramId === telegramId &&
                userEvent.mainParticipantsCount + userEvent.reserveParticipantsCount > 0,
        );

        const { creator: _c, ...row } = eventRowWithGroups(event);
        result.push({ ...row, isParticipant });
    }
    return result;
};
