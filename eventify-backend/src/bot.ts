import {Bot, InlineKeyboard} from "grammy";

export const bot = new Bot(process.env.BOT_TOKEN!);

export const setupBot = () => {
    bot.api.setMyCommands([
        {command: "start", description: process.env.BOT_COMMAND_DESCRIPTION!},
    ]);

    bot.command("start", async (ctx) => {
        if (ctx.from) {
            console.log(`Получена команда /start от: ${ctx.from.username} (ID: ${ctx.from.id}) Тип чата: ${ctx.chat.type}`) ;
        } else {
            console.log("Получена команда /start от неизвестного источника");
        }

        const keyboard = new InlineKeyboard().url(
            "💪 Я в деле",
            process.env.WEB_APP_URL!
        );

        await ctx.reply(
            process.env.REPLAY_DESCRIPTION!,
            {reply_markup: keyboard}
        );
    });
}
