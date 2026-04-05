import { prisma } from "../lib/prisma";
import { pickNextReserveUserEvent } from "./pickNextReserveUserEvent";
import {notifyCreator} from "../utils/telegramNotify";
import {sendTelegramNotification} from "../utils/sendTelegramNotification";

export const decreaseParticipantsService = async (telegramId: string, eventId: number) => {
    const event = await prisma.event.findUnique({
        where: {id: eventId},
        include: {
            UserEvent: {
                include: {user: true}, // Нужно для уведомлений
            },
        },
    });

    if (!event) throw new Error("Event not found");

    const user = await prisma.user.findUnique({
        where: {telegramId},
    });

    if (!user) throw new Error("User not found");

    const participation = await prisma.userEvent.findUnique({
        where: {
            userId_eventId: {
                userId: user.id,
                eventId,
            },
        },
    });

    if (!participation) throw new Error("User is not participating in this event");

    let updatedParticipation = null;

    if (participation.mainParticipantsCount > 1) {
        updatedParticipation = await prisma.userEvent.update({
            where: {
                userId_eventId: {
                    userId: user.id,
                    eventId,
                },
            },
            data: {
                mainParticipantsCount: {decrement: 1},
            },
        });
    } else if (participation.mainParticipantsCount === 1 && participation.reserveParticipantsCount === 0) {
        await prisma.userEvent.delete({
            where: {
                userId_eventId: {
                    userId: user.id,
                    eventId,
                },
            },
        });
    } else {
        // Если резерв есть — уменьшаем резерв.
        // Важно: если после уменьшения и основной, и резервный счётчики стали 0,
        // то пользователь больше не участник и запись связи должна быть удалена.
        const updated = await prisma.userEvent.update({
            where: {
                userId_eventId: {
                    userId: user.id,
                    eventId,
                },
            },
            data: {
                reserveParticipantsCount: {decrement: 1},
            },
        });
        if (updated.mainParticipantsCount === 0 && updated.reserveParticipantsCount === 0) {
            await prisma.userEvent.delete({
                where: {
                    userId_eventId: {
                        userId: user.id,
                        eventId,
                    },
                },
            });
        }
    }

    // Перезапрашиваем событие
    const updatedEvent = await prisma.event.findUnique({
        where: {id: eventId},
        include: {
            UserEvent: {
                include: {user: true},
            },
        },
    });

    if (!updatedEvent) throw new Error("Failed to reload event");

    const totalMain = updatedEvent.UserEvent.reduce(
        (sum: number, ue: any) => sum + ue.mainParticipantsCount,
        0
    );

    if (totalMain < updatedEvent.limit) {
        const reserveToPromote = pickNextReserveUserEvent(updatedEvent.UserEvent);

        if (reserveToPromote) {
            await prisma.userEvent.update({
                where: {
                    userId_eventId: {
                        userId: reserveToPromote.userId,
                        eventId,
                    },
                },
                data: {
                    reserveParticipantsCount: {decrement: 1},
                    mainParticipantsCount: {increment: 1},
                },
            });

            await notifyCreator(eventId,
                `🔄️🔄️🔄️ Участник из резерва перемещён в основной список события «${updatedEvent.title}».\n` +
                    `👤 id ${reserveToPromote.user.telegramId}`)

            // Уведомляем участника
            await sendTelegramNotification(
                reserveToPromote.user.telegramId,
                `🎉 Освободилось место на мероприятии «${updatedEvent.title}»!\n` +
                `✅ Вы переведены в основной список участников.\n` +
                `📅 Дата: ${new Date(updatedEvent.date).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}\n` +
                `⏰ Время: ${new Date(updatedEvent.date).toLocaleTimeString('ru-RU', { timeZone: 'UTC' })}\n` +
                `👤 Ваш Telegram ID: ${reserveToPromote.user.telegramId}`
            );

        }
    }

    await notifyCreator(eventId, `➖ Участник id ${user.telegramId} покинул мероприятие.`);


    const finalEvent = await prisma.event.findUnique({
        where: {id: eventId},
        include: {UserEvent: true},
    });

    // if (creator?.telegramId) {
    //     const totalMain = finalEvent?.UserEvent.reduce((sum, ue) => sum + ue.mainParticipantsCount, 0) || 0;
    //     const totalReserve = finalEvent?.UserEvent.reduce((sum, ue) => sum + ue.reserveParticipantsCount, 0) || 0;
    //     await sendTelegramNotification(
    //         creator.telegramId,
    //         `➖ ${user.firstName || 'Пользователь'} (${user.userName ? '@' + user.userName : 'без username'}) покинул событие «${event.title}».\n` +
    //         `👤 Основных участников: ${totalMain}/${event.limit}\n` +
    //         `⏳ В резерве: ${totalReserve}`
    //     );
    // }
    return {
        updatedParticipant: updatedParticipation,
        updatedEvent: finalEvent,
        message: "User participation decreased successfully",
    };
};
