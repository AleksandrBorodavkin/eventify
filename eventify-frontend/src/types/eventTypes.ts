/** Группа события в ответе API (из SavedGroupChat через связь). */
export type EventGroupRef = {
  chatId: string;
  label: string;
};

/** Событие с бэкенда (ответ GET / списки / создание / обновление). */
export interface IEvent {
  id?: number;
  title: string;
  description: string;
  groups: EventGroupRef[];
  /** Дата в ISO-строке или значении, совместимом с `new Date(...)` */
  date: string;
  limit: number;
  status: boolean;
  creatorId?: number;
  /** GET /events/all: сумма основных мест по всем записям UserEvent */
  mainParticipantsTotal?: number;
  /** GET /events/all: сумма резервных мест */
  reserveParticipantsTotal?: number;
  /** GET /events/all: текущий пользователь в списке участников или резерва */
  isParticipant?: boolean;
  /** Несколько мест на одного участника (+/−); иначе не более одной записи. */
  allowMultipleSlotsPerUser?: boolean;
}

/** Тело POST /events и PATCH /event/:id (форма шлёт строковые id чатов). */
export interface IEventWriteBody {
  title: string;
  description: string;
  groupIds: string[];
  groupLabels?: Record<string, string>;
  date: string;
  limit: number;
  status: boolean;
  /** По умолчанию false — одно место на участника. */
  allowMultipleSlotsPerUser?: boolean;
}

export type CreateEventResponse = {
  event: IEvent;
  message: string;
};
