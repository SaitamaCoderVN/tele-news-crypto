const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
require('dotenv').config()
const NewsService = require('news-crypto')

const bot = new Telegraf(process.env.BOT_TOKEN)
const newsService = new NewsService()

const userData = {}

// function
function sendWelcomeMessage(ctx, username) {
    ctx.reply(
      `Welcome @${username} to the KaiaNews Bot. Here are the available commands:
      /setregion : Filter by region
      /setcurrencies : Filter by currency
      /news : Get news updates`
    )
}

function sendChoseRegion(ctx) {
    const keyboard = [
        [
            { text: 'Deutsch', callback_data: 'add_region_de' },
            { text: 'Dutch', callback_data: 'add_region_nl' },
            { text: 'Español', callback_data: 'add_region_es' },
            { text: 'Français', callback_data: 'add_region_fr' },
            { text: 'Italiano', callback_data: 'add_region_it' },
            { text: 'Português', callback_data: 'add_region_pt' }
        ],
        [
            { text: 'Русский', callback_data: 'add_region_ru' },
            { text: '한국인', callback_data: 'add_region_ko' },
            { text: 'Türkçe', callback_data: 'add_region_tr' },
            { text: 'عربي', callback_data: 'add_region_ar' },
            { text: '中國人', callback_data: 'add_region_cn' },
            { text: '日本', callback_data: 'add_region_jp' }
        ],
        [
            { text: 'My All Region', callback_data: 'myall_region' },
            { text: 'Remove Region', callback_data: 'remove_region' }
        ]
    ]

    ctx.reply('Select the region you want to receive news from', {
        reply_markup: {
            inline_keyboard: keyboard
        }
    })
}

function sendChoseCurrency(ctx) {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'BTC', callback_data: 'add_currency_BTC' },
                    { text: 'ETH', callback_data: 'add_currency_ETH' }
                ],
                [{ text: 'Selected currency list', callback_data: 'added_currency' }],
                [{ text: 'Delete selected currency', callback_data: 'remove_currency' }]
            ]
        }
    }
    ctx.reply('Select the currencies you want to filter by', options)
}

function sendNewsUpdate(ctx, news) {
    ctx.reply(`${news}`)
}

function sendRegionRemoveMessage(ctx, regions) {
    const inlineKeyboard = regions.map((region) => [{ text: region, callback_data: `remove_region_${region}` }])
    ctx.reply('Select the region you want to delete:', {
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    })
}

function sendCurrencyRemoveMessage(ctx, currencies) {
    const inlineKeyboard = currencies.map((currency) => [
        { text: currency, callback_data: `remove_currency_${currency}` }
    ])
    ctx.reply('Select the currency you want to delete:', {
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    })
}

function sendMyAllRegionMessage(ctx, regions) {
    const inlineKeyboard = regions.map((region) => [{ text: region, callback_data: 'noop' }])
    ctx.reply('Here are all the regions you selected:', {
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    })
}

function sendMyAllCurrencyMessage(ctx, currencies) {
    const inlineKeyboard = currencies.map((currency) => [{ text: currency, callback_data: 'noop' }])
    ctx.reply('Here are all the currencies you selected:', {
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    })
}

function sendMessageToUser(ctx, message) {
    ctx.reply(message)
}

bot.start((ctx) => {
    const username = ctx.message.from.username
    sendWelcomeMessage(ctx, username)
})

bot.command('setregion', (ctx) => {
    sendChoseRegion(ctx)
});

bot.command('setcurrencies', (ctx) => {
    sendChoseCurrency(ctx)
});

bot.on('callback_query', async (ctx) => {
    const chatId = ctx.callbackQuery.message?.chat.id
    if (!chatId) return

    const data = ctx.callbackQuery.data
    if (data) {
        if (data.startsWith('add_region_')) {
            const region = data.substring(11)
            if (!userData[chatId]) userData[chatId] = { regions: [], currencies: [] }
            userData[chatId].regions.push(region)
            await ctx.answerCbQuery(`You have selected the region: ${region}`)
            await ctx.editMessageText(`You have selected the region: ${region}\nYour current regions: ${userData[chatId].regions.join(', ')}`)
        } else if (data.startsWith('remove_region_')) {
            const region = data.substring(14)
            if (userData[chatId]) {
                userData[chatId].regions = userData[chatId].regions.filter(r => r !== region)
                await ctx.answerCbQuery(`You have removed the region: ${region}`)
                await ctx.editMessageText(`You have removed the region: ${region}\nYour current regions: ${userData[chatId].regions.join(', ')}`)
            }
        } else if (data === 'remove_region') {
            if (userData[chatId]) {
                sendRegionRemoveMessage(ctx, userData[chatId].regions)
            }
        } else if (data === 'myall_region') {
            if (userData[chatId]) {
                sendMyAllRegionMessage(ctx, userData[chatId].regions)
            }
        } else if (data.startsWith('add_currency_')) {
            const currency = data.substring(13)
            if (!userData[chatId]) userData[chatId] = { regions: [], currencies: [] }
            userData[chatId].currencies.push(currency)
            await ctx.answerCbQuery(`You have selected the currency: ${currency}`)
            await ctx.editMessageText(`You have selected the currency: ${currency}\nYour current currencies: ${userData[chatId].currencies.join(', ')}`)
        } else if (data === 'added_currency') {
            if (userData[chatId]) {
                sendMyAllCurrencyMessage(ctx, userData[chatId].currencies)
            }
        } else if (data === 'remove_currency') {
            if (userData[chatId]) {
                sendCurrencyRemoveMessage(ctx, userData[chatId].currencies)
            }
        } else if (data.startsWith('remove_currency_')) {
            const currency = data.substring(16)
            if (userData[chatId]) {
                userData[chatId].currencies = userData[chatId].currencies.filter(c => c !== currency)
                await ctx.answerCbQuery(`You have removed the currency: ${currency}`)
                await ctx.editMessageText(`You have removed the currency: ${currency}\nYour current currencies: ${userData[chatId].currencies.join(', ')}`)
            }
        }
    }
})

bot.command("news", async (ctx) => {
    const chatId = ctx.message.chat.id
    const user = userData[chatId]
    await getNews(ctx, user?.regions || ['en'], user?.currencies)
})

// default command
bot.command(/.*/, (ctx) => {
    const command = ctx.message.text?.toLowerCase()

    if (command !== '/start' && command !== '/setregion' && command !== '/setcurrencies' && command !== '/news') {
        sendMessageToUser(ctx, ' 🤖 Invalid command, please open menu and choose the command you want to use ')
    }
})

bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on(message('sticker'), (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

async function getNews(ctx, regions, currencies) {
    regions = regions || ['en'];
    currencies = currencies || [];
    const news = await newsService.fetchNewsForRegions(regions, currencies, process.env.NEWS_API_TOKEN);
    console.log(regions.toString(), currencies.toString());
    sendNewsUpdate(ctx, news);
}
