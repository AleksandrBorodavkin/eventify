import { normalizeTelegramSupergroupChatId } from "../config/initialChatEnv";
import { isTelegramUserInChat } from "./telegramGroupMembership";

export type EventVisibilityInput = {
    creatorTelegramId: string;
    groupIds: string[];
};

/**
 * Создатель всегда видит своё событие.
 * Остальные — только если состоят в Telegram хотя бы в одном из groupIds.
 */
export async function canUserViewEvent(
    viewerTelegramId: number,
    event: EventVisibilityInput,
    context: string,
): Promise<boolean> {
    const viewer = String(viewerTelegramId);
    if (viewer === String(event.creatorTelegramId)) {
        console.info("[eventVisibility] allow creator", { context, viewer });
        return true;
    }

    const rawIds = event.groupIds ?? [];
    const groupIds = rawIds
        .map((g) => normalizeTelegramSupergroupChatId(String(g).trim()))
        .filter(Boolean);

    if (groupIds.length === 0) {
        console.warn("[eventVisibility] deny empty groupIds (not creator)", {
            context,
            viewer,
        });
        return false;
    }

    for (const chatId of groupIds) {
        const member = await isTelegramUserInChat(viewerTelegramId, chatId);
        if (member) {
            console.info("[eventVisibility] allow memberOfGroup", {
                context,
                viewer,
                chatId,
            });
            return true;
        }
    }

    console.warn("[eventVisibility] deny notMemberOfAnyGroup", {
        context,
        viewer,
        groupIds,
    });
    return false;
}
