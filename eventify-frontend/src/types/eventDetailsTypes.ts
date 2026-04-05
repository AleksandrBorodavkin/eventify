import type { EventGroupRef } from '@/types/eventTypes';

/** Снимок user из initData, сохранённый на бэкенде при записи на событие. */
export type EventParticipant = {
  userId: number;
  telegramId: string;
  paid: boolean;
  createdAt: string;
  mainParticipantsCount: number;
  reserveParticipantsCount: number;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string | null;
  isPremium?: boolean | null;
  isBot?: boolean | null;
  photoUrl?: string | null;
  allowsWriteToPm?: boolean | null;
  addedToAttachmentMenu?: boolean | null;
  initProfileUpdatedAt?: string | null;
  /** Как у организатора: https://t.me/… или tg://user?id= */
  contactLink?: string;
};

export type EventCreator = {
  id: number;
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  /** https://t.me/username или tg://user?id= */
  contactLink: string;
};

export type EventDetails = {
  id: number;
  title: string;
  description: string;
  /** Подписи к чатам (у организатора) для отображения */
  groups: EventGroupRef[];
  date: string;
  limit: number;
  status: boolean;
  /** Несколько мест одному участнику (шаг +/−). */
  allowMultipleSlotsPerUser: boolean;
  totalParticipantsCount: number;
  creator: EventCreator;
  participants: EventParticipant[];
};

