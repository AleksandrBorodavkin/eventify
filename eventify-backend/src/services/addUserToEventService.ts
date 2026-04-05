import {getInitData} from "../middleware/authMiddleware";
import {Request, Response} from "express";
import { prisma } from "../lib/prisma";
import {canUserViewEvent} from "./eventVisibilityService";
import {
    groupChatIdsFromEventLinks,
    prismaSavedGroupLinksInclude,
} from "./eventSavedGroupLinks";
import {getEventByIdWithUsersService} from "./index";
import { upsertUserFromInitDataUser } from "./telegramInitUserSnapshot";
import {notifyCreator} from "../utils/telegramNotify";
import {paramId} from "../utils/paramId";

export const addUserToEventService = async (req: Request, res: Response) => {
    const currentUser = getInitData(res).user;
    if (!currentUser) {
        throw new Error("В init data нет пользователя");
    }
    const eventIdStr = paramId(req.params.eventId);

    const event = await prisma.event.findUnique({
        where: { id: parseInt(eventIdStr, 10) },
        include: {
            creator: { select: { telegramId: true } },
            savedGroupLinks: prismaSavedGroupLinksInclude,
        },
    });

    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    const allowed = await canUserViewEvent(
        Number(currentUser.id),
        {
            creatorTelegramId: event.creator.telegramId,
            groupIds: groupChatIdsFromEventLinks(event.savedGroupLinks),
        },
        `POST /events/${eventIdStr}/participants`,
    );
    if (!allowed) {
        console.warn("[eventVisibility] forbid join", {
            eventId: event.id,
            viewer: String(currentUser.id),
        });
        return res.status(403).json({ error: "Нет доступа к этому событию" });
    }

    // Получаем текущее количество всех участников
    const eventDetails = await getEventByIdWithUsersService(eventIdStr);
    const isReserve = eventDetails.totalParticipantsCount >= eventDetails.limit;

    const user = await upsertUserFromInitDataUser(currentUser);

    let existingParticipation = await prisma.userEvent.findUnique({
        where: {
            userId_eventId: {
                userId: user.id,
                eventId: event.id,
            },
        },
    });

    // «Мёртвая» строка (0 основных и 0 в резерве) не должна сохранять старый createdAt при новой записи —
    // иначе человек окажется не в конце очереди, а на старом месте.
    if (
        existingParticipation &&
        existingParticipation.mainParticipantsCount + existingParticipation.reserveParticipantsCount ===
            0
    ) {
        await prisma.userEvent.delete({
            where: {
                userId_eventId: {
                    userId: user.id,
                    eventId: event.id,
                },
            },
        });
        existingParticipation = null;
    }

    let newParticipation;

    if (existingParticipation) {
        const totalSlots =
            existingParticipation.mainParticipantsCount +
            existingParticipation.reserveParticipantsCount;
        if (totalSlots > 0 && !event.allowMultipleSlotsPerUser) {
            return res.status(400).json({
                error:
                    'Для этого события одному участнику доступно только одно место',
            });
        }
        // Обновляем существующую запись (ещё один слот при уже активном участии)
        newParticipation = await prisma.userEvent.update({
            where: {
                userId_eventId: {
                    userId: user.id,
                    eventId: event.id,
                },
            },
            data: isReserve
                ? { reserveParticipantsCount: { increment: 1 } }
                : { mainParticipantsCount: { increment: 1 } },
        });
    } else {
        // Создаём новую запись
        newParticipation = await prisma.userEvent.create({
            data: {
                userId: user.id,
                eventId: event.id,
                mainParticipantsCount: isReserve ? 0 : 1,
                reserveParticipantsCount: isReserve ? 1 : 0,
            },
        });
    }
    const role = isReserve ? "в резервный список" : "в основной список";
    const u = currentUser as {
        id: number;
        first_name?: string;
        last_name?: string;
        firstName?: string;
        lastName?: string;
        username?: string;
    };
    const display =
        `${u.first_name ?? u.firstName ?? ''} ${u.last_name ?? u.lastName ?? ''}`.trim()
        || `id ${u.id}`;
    const uname = u.username ? ` @${u.username}` : '';
    await notifyCreator(event.id, `➕ ${display}${uname}\nприсоединился ${role}`);

    return {
        newParticipant: newParticipation,
        newEvent: event,
        isReserve,
        message: isReserve
            ? 'Пользователь добавлен в резерв участников'
            : 'Пользователь добавлен в список основных участников',
    };
};
