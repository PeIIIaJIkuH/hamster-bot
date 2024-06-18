import dotenv from 'dotenv';
import { Bot, Context, GrammyError, HttpError, session } from 'grammy';
import { type Conversation, type ConversationFlavor, conversations, createConversation } from '@grammyjs/conversations';

import { BOT_COMMAND } from './constants';
import { MenuButtonWebApp } from 'grammy/types';

dotenv.config();

type BotContext = Context & ConversationFlavor;
type BotConversation = Conversation<BotContext>;

const bot = new Bot<BotContext>(process.env.BOT_API_TOKEN ?? '');

bot.api.setChatMenuButton({
	menu_button: {
		text: 'Launch',
		type: 'web_app',
		web_app: {
			url: process.env.WEB_APP_URL ?? '',
		},
	},
});

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

bot.api.setMyCommands([
	{ command: BOT_COMMAND.START, description: 'Start the bot' },
	{ command: BOT_COMMAND.SET_INIT_DATA, description: 'Set the initial data' },
	{ command: BOT_COMMAND.GET_INIT_DATA, description: 'Get the initial data' },
	{ command: BOT_COMMAND.RESET_INIT_DATA, description: 'Reset the initial data' },
]);

async function setInitData(conversation: BotConversation, ctx: BotContext) {
	await ctx.reply('Please enter the initial data');
	const initDataCtx = await conversation.waitFor(':text');
	const menuButton = (await ctx.getChatMenuButton()) as MenuButtonWebApp;
	const url = new URL(menuButton.web_app.url);
	url.searchParams.delete('initDataRaw');
	url.searchParams.set('initDataRaw', initDataCtx.msg.text);
	await ctx.setChatMenuButton({
		chat_id: ctx.chatId,
		menu_button: { ...menuButton, web_app: { url: `${process.env.WEB_APP_URL}${url.search}` } },
	});
	await ctx.reply('Initial data is set successfully');
}

async function getInitData(_conversation: BotConversation, ctx: BotContext) {
	const menuButton = (await ctx.getChatMenuButton({ chat_id: ctx.chatId })) as MenuButtonWebApp;
	const url = new URL(menuButton.web_app.url);
	const initDataRaw = url.searchParams.get('initDataRaw');
	await ctx.api.sendMessage(String(ctx.chatId), `\`${initDataRaw}\``, {
		parse_mode: 'MarkdownV2',
	});
}

async function resetInitData(_conversation: BotConversation, ctx: BotContext) {
	const menuButton = (await ctx.getChatMenuButton({ chat_id: ctx.chatId })) as MenuButtonWebApp;
	const url = new URL(menuButton.web_app.url);
	url.searchParams.delete('initDataRaw');
	await ctx.setChatMenuButton({
		chat_id: ctx.chatId,
		menu_button: { ...menuButton, web_app: { url: url.toString() } },
	});
	await ctx.reply('Initial data is reset successfully');
}

bot.use(createConversation(setInitData));
bot.use(createConversation(getInitData));
bot.use(createConversation(resetInitData));

bot.command(BOT_COMMAND.START, (ctx) =>
	ctx.reply('Set the initial data with /set_init_data', { reply_parameters: { message_id: ctx.msgId } }),
);

bot.command(BOT_COMMAND.SET_INIT_DATA, async (ctx) => {
	await ctx.conversation.enter('setInitData');
});

bot.command(BOT_COMMAND.GET_INIT_DATA, async (ctx) => {
	await ctx.conversation.enter('getInitData');
});

bot.command(BOT_COMMAND.RESET_INIT_DATA, async (ctx) => {
	await ctx.conversation.enter('resetInitData');
});

bot.catch((err) => {
	const ctx = err.ctx;
	console.error(`Error while handling update ${ctx.update.update_id}:`);
	const e = err.error;
	if (e instanceof GrammyError) {
		console.error('Error in request:', e.description);
	} else if (e instanceof HttpError) {
		console.error('Could not contact Telegram:', e);
	} else {
		console.error('Unknown error:', e);
	}
});

bot.start();
