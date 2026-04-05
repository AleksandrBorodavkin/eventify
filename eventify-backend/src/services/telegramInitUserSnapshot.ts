import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

/**
 * Поля `user` из распарсенного initData (Telegram Mini Apps).
 * @see https://docs.telegram-mini-apps.com/platform/init-data#user
 */
export type InitDataUserLike = {
    first_name: string;
    id: number;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
    is_premium?: boolean;
    is_bot?: boolean;
    allows_write_to_pm?: boolean;
    added_to_attachment_menu?: boolean;
};

function userProfileCreateAndUpdate(u: InitDataUserLike) {
    return {
        firstName: u.first_name,
        lastName: u.last_name ?? null,
        username: u.username ?? null,
        languageCode: u.language_code ?? null,
        photoUrl: u.photo_url ?? null,
        isPremium: u.is_premium ?? null,
        isBot: u.is_bot ?? null,
        allowsWriteToPm: u.allows_write_to_pm ?? null,
        addedToAttachmentMenu: u.added_to_attachment_menu ?? null,
        initProfileUpdatedAt: new Date(),
    };
}

export function toInitDataUserLike(raw: unknown): InitDataUserLike | null {
    if (!raw || typeof raw !== "object") return null;
    const u = raw as Record<string, unknown>;
    const id = u.id;
    const first = u.first_name;
    if (typeof id !== "number" || !Number.isFinite(id)) return null;
    if (typeof first !== "string" || !first.length) return null;
    return raw as InitDataUserLike;
}

/** Создаёт или обновляет User по данным user из провалидированного initData. */
export async function upsertUserFromInitDataUser(currentUser: unknown) {
    const u = toInitDataUserLike(currentUser);
    if (!u) {
        throw new Error("В init data нет корректного объекта user");
    }
    const profile = userProfileCreateAndUpdate(u);
    return prisma.user.upsert({
        where: { telegramId: String(u.id) },
        create: {
            telegramId: String(u.id),
            ...profile,
        } as Prisma.UserUncheckedCreateInput,
        update: profile as Prisma.UserUpdateInput,
    });
}
