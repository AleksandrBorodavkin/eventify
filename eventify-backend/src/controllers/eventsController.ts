import type { Request, Response } from "express";
import { getAllEventsForViewer } from "../services/getAllEventsService";
import { createEventService, getMySavedGroupsService } from "../services";
import { getInitData } from "../middleware/authMiddleware";
import type { IEvent } from "../interfaces/IEvent";
import { getInitialChatId, getInitialChatLink } from "../config/initialChatEnv";
import { isTelegramUserInChat } from "../services/telegramGroupMembership";
import {
  InvalidTelegramChatIdsError,
  TELEGRAM_GROUP_IDS_INVALID_CODE,
} from "../services/validateTelegramGroupIds";

export const getAllEventsController = async (req: Request, res: Response) => {
  try {
    const viewerId = Number(getInitData(res).user.id);
    const events = await getAllEventsForViewer(viewerId);
    res.status(200).json(events);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Failed to load events" });
  }
};

export const getMySavedGroupsController = async (req: Request, res: Response) => {
  try {
    const telegramId = String(getInitData(res).user.id);
    const result = await getMySavedGroupsService(telegramId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Failed to load saved groups" });
  }
};

/** Проверка вступления в обязательную группу (для кнопки «Создать событие» и страницы создания). */
export const getInitialChatMembershipController = async (req: Request, res: Response) => {
  try {
    const user = getInitData(res).user;
    const telegramUserId = Number(user.id);
    if (!Number.isFinite(telegramUserId)) {
      return res.status(400).json({
        error: "Не удалось определить пользователя Telegram.",
      });
    }
    const chatId = getInitialChatId();
    const joinChatLink = getInitialChatLink();
    const inGroup = await isTelegramUserInChat(telegramUserId, chatId);
    res.status(200).json({ inGroup, joinChatLink });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Failed to check chat membership" });
  }
};

export const createEventController = async (req: Request, res: Response) => {
  const event: IEvent = req.body;
  if (!Array.isArray(event.groupIds) || event.groupIds.length === 0) {
    return res.status(400).json({ error: "Укажите хотя бы один ID группы" });
  }
  const currentUser = getInitData(res).user;
  try {
    const result = await createEventService(event, currentUser);
    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof InvalidTelegramChatIdsError) {
      res.status(400).json({
        code: TELEGRAM_GROUP_IDS_INVALID_CODE,
        error: error.message,
        invalidGroupIds: error.invalidIds,
      });
      return;
    }
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Event with this telegramId already exists." });
    } else {
      res.status(500).json({ error: error?.message ?? "Failed to create event" });
    }
  }
};

