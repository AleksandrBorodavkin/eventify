import { prisma } from "../lib/prisma";
import { notifyCreator } from "../utils/telegramNotify";
import { promoteReservesUntilFull } from "./promoteReservesUntilFull";

export const removeParticipantByOrganizerService = async (
  eventId: number,
  participantTelegramId: number,
  organizerTelegramId: number,
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { creator: true },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const organizer = await prisma.user.findUnique({
    where: { telegramId: organizerTelegramId.toString() },
  });

  if (!organizer || event.creatorId !== organizer.id) {
    throw new Error("Only event creator can remove participants");
  }

  const participant = await prisma.user.findUnique({
    where: { telegramId: participantTelegramId.toString() },
  });

  if (!participant) {
    throw new Error("Participant not found");
  }

  const participation = await prisma.userEvent.findUnique({
    where: {
      userId_eventId: {
        userId: participant.id,
        eventId,
      },
    },
  });

  if (!participation) {
    throw new Error("User is not participating in this event");
  }

  if (
    participation.mainParticipantsCount + participation.reserveParticipantsCount ===
    0
  ) {
    throw new Error("User is not participating in this event");
  }

  await prisma.userEvent.delete({
    where: {
      userId_eventId: {
        userId: participant.id,
        eventId,
      },
    },
  });

  await promoteReservesUntilFull(eventId);

  await notifyCreator(
    eventId,
    `➖ Организатор исключил участника id ${participant.telegramId} из мероприятия «${event.title}».`,
  );

  return {
    message: "Participant removed successfully",
  };
};
