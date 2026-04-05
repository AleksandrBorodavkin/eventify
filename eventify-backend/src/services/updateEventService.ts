import { prisma } from "../lib/prisma";
import { IEvent } from "../interfaces/IEvent";
import { upsertUserSavedGroupLabels } from "./savedGroupChatService";
import { assertGroupIdsExistForBot } from "./validateTelegramGroupIds";
import {
    prismaSavedGroupLinksInclude,
    publicGroupsFromSavedLinks,
    resolveSavedGroupChatIdsForCreator,
    uniqueChatIdsPreserveOrder,
} from "./eventSavedGroupLinks";

export const updateEventService = async (
    eventId: number,
    updatedData: Partial<IEvent>,
    currentUserTelegramId: any
) => {
    const existingEvent = await prisma.event.findUnique({
        where: {id: eventId},
    });

    if (!existingEvent) {
        throw new Error("Event not found");
    }
    const currentUser = await prisma.user.findUnique({
        where: {telegramId: currentUserTelegramId.toString()},
    });
    if (existingEvent.creatorId !== currentUser?.id) {
        throw new Error("Unauthorized: Only the creator can update the event");
    }

    const groupIds =
        updatedData.groupIds !== undefined
            ? (updatedData.groupIds ?? [])
                  .map((id) => String(id).trim())
                  .filter(Boolean)
            : undefined;

    if (groupIds !== undefined && groupIds.length === 0) {
        throw new Error("Укажите хотя бы один ID группы");
    }

    let savedIds: number[] | undefined;
    if (groupIds !== undefined) {
        if (!currentUser) {
            throw new Error("Unauthorized: Only the creator can update the event");
        }
        const ordered = uniqueChatIdsPreserveOrder(groupIds);
        await assertGroupIdsExistForBot(ordered);
        await upsertUserSavedGroupLabels(
            currentUser.id,
            ordered,
            updatedData.groupLabels,
        );
        savedIds = await resolveSavedGroupChatIdsForCreator(
            currentUser.id,
            ordered,
        );
    }

    const updated = await prisma.event.update({
        where: {id: eventId},
        data: {
            title: updatedData.title,
            description: updatedData.description,
            date: updatedData.date ? new Date(updatedData.date) : undefined,
            limit: updatedData.limit !== undefined ? Number(updatedData.limit) : undefined,
            status: updatedData.status,
            allowMultipleSlotsPerUser:
                updatedData.allowMultipleSlotsPerUser !== undefined
                    ? Boolean(updatedData.allowMultipleSlotsPerUser)
                    : undefined,
            ...(savedIds !== undefined
                ? {
                      savedGroupLinks: {
                          deleteMany: {},
                          create: savedIds.map((savedGroupChatId, sortOrder) => ({
                              savedGroupChatId,
                              sortOrder,
                          })),
                      },
                  }
                : {}),
        },
        include: {
            savedGroupLinks: prismaSavedGroupLinksInclude,
        },
    });

    const { groups } = publicGroupsFromSavedLinks(updated.savedGroupLinks);
    const { savedGroupLinks: _, ...rest } = updated;

    return { event: { ...rest, groups }, message: "Event updated successfully." };
};
