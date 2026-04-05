import { prisma } from "../lib/prisma";
import { buildTelegramUserContactLink } from "./telegramUserProfile";
import {
    prismaSavedGroupLinksInclude,
    publicGroupsFromSavedLinks,
} from "./eventSavedGroupLinks";

export const getEventByIdWithUsersService = async (eventId: string) => {
    const event = await prisma.event.findUnique({
        where: {
            id: parseInt(eventId),
        },
        include: {
            creator: true, // Включаем создателя события
            savedGroupLinks: prismaSavedGroupLinksInclude,
            UserEvent: {
                include: {
                    user: true, // Включаем пользователя через UserEvent
                },
            },
        }
    })
    if (!event) {
        throw new Error('Event not found');
    }

    const totalParticipantsCount = event.UserEvent.reduce(
        (sum: number, userEvent: any) => sum + userEvent.mainParticipantsCount + userEvent.reserveParticipantsCount,
        0,
    );
    const activeUserEvents = event.UserEvent.filter(
        (userEvent: any) => (userEvent.mainParticipantsCount + userEvent.reserveParticipantsCount) > 0
    ).sort((a: any, b: any) => {
        // Порядок «кто когда в текущем составе записался»: новая строка UserEvent = новый createdAt
        // (после полного выхода строка удаляется, при повторной записи — конец списка).
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        if (ta !== tb) return ta - tb;
        return a.userId - b.userId;
    });

    const contactLink = buildTelegramUserContactLink(
        event.creator.telegramId,
        event.creatorUsername,
    );

    const { groups } = publicGroupsFromSavedLinks(event.savedGroupLinks);

    const { savedGroupLinks: _sg, ...eventRest } = event;

    return {
        id: eventRest?.id,
        title: eventRest?.title,
        creator: {
            id: event.creator.id,
            telegramId: event.creator.telegramId,
            firstName: eventRest.creatorFirstName,
            lastName: eventRest.creatorLastName,
            username: eventRest.creatorUsername,
            contactLink,
        },
        groups,
        limit: eventRest?.limit,
        status: eventRest?.status,
        allowMultipleSlotsPerUser: eventRest.allowMultipleSlotsPerUser ?? false,
        description: eventRest?.description,
        date: eventRest?.date,
        totalParticipantsCount: totalParticipantsCount,
        participants: activeUserEvents.map((userEvent: any) => {
            const u = userEvent.user;
            return {
                userId: userEvent.userId,
                paid: userEvent.paid,
                createdAt: userEvent.createdAt,
                telegramId: u.telegramId,
                firstName: u.firstName,
                lastName: u.lastName,
                username: u.username,
                languageCode: u.languageCode,
                isPremium: u.isPremium,
                isBot: u.isBot,
                photoUrl: u.photoUrl,
                allowsWriteToPm: u.allowsWriteToPm,
                addedToAttachmentMenu: u.addedToAttachmentMenu,
                initProfileUpdatedAt: u.initProfileUpdatedAt,
                contactLink: buildTelegramUserContactLink(u.telegramId, u.username),
                mainParticipantsCount: userEvent.mainParticipantsCount,
                reserveParticipantsCount: userEvent.reserveParticipantsCount,
            };
        }),
    };

}
