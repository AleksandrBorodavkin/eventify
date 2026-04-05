export interface IEvent {
    id?: number;
    title: string;
    limit: number;
    status: boolean;
    description: string;
    date: string; // date всегда строка
    groupIds: string[];
    /** Подписи к chatId: что показывать вместо сырого ID */
    groupLabels?: Record<string, string>;
    participantCount?: string;
    participants?: [];
    creator?: { id: number; telegramId: string };
    /** Несколько мест на одного участника (иначе только одна запись). */
    allowMultipleSlotsPerUser?: boolean;
}
