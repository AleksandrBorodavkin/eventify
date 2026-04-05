import { prisma } from "../lib/prisma";
import {
    getInitialChatId,
    groupIdsContainSameChat,
} from "../config/initialChatEnv";
import {IEvent} from "../interfaces/IEvent";
import { isTelegramUserInChat } from "./telegramGroupMembership";
import { upsertUserSavedGroupLabels } from "./savedGroupChatService";
import { upsertUserFromInitDataUser } from "./telegramInitUserSnapshot";
import { assertGroupIdsExistForBot } from "./validateTelegramGroupIds";
import {
    prismaSavedGroupLinksInclude,
    publicGroupsFromSavedLinks,
    resolveSavedGroupChatIdsForCreator,
    uniqueChatIdsPreserveOrder,
} from "./eventSavedGroupLinks";

/** Поля user из подписанного initData (Telegram Mini App). */
function snapshotCreatorFromInitUser(currentUser: unknown): {
    creatorFirstName: string | null;
    creatorLastName: string | null;
    creatorUsername: string | null;
} {
    if (!currentUser || typeof currentUser !== "object") {
        return {
            creatorFirstName: null,
            creatorLastName: null,
            creatorUsername: null,
        };
    }
    const u = currentUser as Record<string, unknown>;
    const first = u.first_name;
    const last = u.last_name;
    const un = u.username;
    return {
        creatorFirstName: typeof first === "string" ? first : null,
        creatorLastName: typeof last === "string" ? last : null,
        creatorUsername: typeof un === "string" ? un : null,
    };
}

export const createEventService = async (event: IEvent, currentUser: any) => {
    let groupIds = (event.groupIds ?? [])
        .map((id) => String(id).trim())
        .filter(Boolean);

    const mandatoryChatId = getInitialChatId();
    const telegramUserId = Number(currentUser?.id);
    if (!Number.isFinite(telegramUserId)) {
        throw new Error("Не удалось определить ID пользователя Telegram для проверки группы.");
    }

    const inMandatoryChat = await isTelegramUserInChat(
        telegramUserId,
        mandatoryChatId,
    );
    if (!inMandatoryChat) {
        if (!groupIdsContainSameChat(groupIds, mandatoryChatId)) {
            groupIds = [...groupIds, mandatoryChatId];
        }
    }

    const ordered = uniqueChatIdsPreserveOrder(groupIds);
    await assertGroupIdsExistForBot(ordered);

    const newUser = await upsertUserFromInitDataUser(currentUser);
    await upsertUserSavedGroupLabels(newUser.id, ordered, event.groupLabels);
    const savedIds = await resolveSavedGroupChatIdsForCreator(
        newUser.id,
        ordered,
    );

    const creatorSnap = snapshotCreatorFromInitUser(currentUser);
    const created = await prisma.event.create({
        data: {
            title: event.title,
            creatorId: newUser.id,
            description: event.description,
            ...creatorSnap,
            date: new Date(event.date).toISOString(),
            limit: Number(event.limit),
            status: event.status,
            allowMultipleSlotsPerUser: Boolean(event.allowMultipleSlotsPerUser),
            savedGroupLinks: {
                create: savedIds.map((savedGroupChatId, sortOrder) => ({
                    savedGroupChatId,
                    sortOrder,
                })),
            },
        },
        include: {
            savedGroupLinks: prismaSavedGroupLinksInclude,
        },
    });

    const { groups } = publicGroupsFromSavedLinks(created.savedGroupLinks);
    const { savedGroupLinks: _, ...rest } = created;

    return { event: { ...rest, groups }, message: "Event created successfully." };
};
