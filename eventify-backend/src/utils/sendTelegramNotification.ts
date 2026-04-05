import axios from 'axios';

export const sendTelegramNotification = async (telegramId: string, message: string) => {
    const BOT_TOKEN = process.env.BOT_TOKEN;

    if (!BOT_TOKEN) {
        console.error("❌ BOT_TOKEN не найден в .env");
        return;
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        await axios.post(url, {
            chat_id: telegramId,
            text: message,
            parse_mode: "HTML",
        });
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
            console.error("❌ Ошибка при отправке уведомления:", err.response?.data || err.message);
        } else if (err instanceof Error) {
            console.error("❌ Неизвестная ошибка:", err.message);
        } else {
            console.error("❌ Что-то пошло не так:", err);
        }
    }
};
