const { ActivityType } = require("discord-api-types/v9");
const { Events } = require("discord.js");
// const coinGeckoApi = "https://api.coingecko.com/api/v3/simple/price?ids=pixels&vs_currencies=php&precision=2";
const binanceApi = "https://api.binance.com/api/v3/avgPrice?symbol=PIXELUSDT";
const forexApi = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`
------------------------------------------------------
> Logging in...
------------------------------------------------------
Logged in as ${client.user.tag}
Working on ${client.guilds.cache.size} servers!
${client.channels.cache.size} channels and ${client.users.cache.size} users cached!
------------------------------------------------------
------------------------------------------------------
--------------------Bot by MarKPauL-------------------
------------------------------------------------------
------------------------------------------------------
`);
		// Cache bot user
		const guild = await client.guilds.cache.get(process.env.guildId);
		const bot = await guild.members.fetch(process.env.clientId);

		setInterval(async () => {
			try {
			  const pixel = await fetch(binanceApi).then(response => response.json());
			  const forex = await fetch(forexApi).then(response => response.json());
			  
			  const price = (pixel.price * forex.usd.php).toFixed(2); // convert Pixel (usd) to Fiat (php)
			  
			  await bot.setNickname(`$PIXELS ₱${price}`);
			  console.log(price);
			} catch (error) {
			  console.error('Error updating nickname:', error.message);
			}
		  }, 60000);
		
		// Set $Pixels price on Nickname
		/** 
		setInterval(async () => {
			const price = await fetch(coinGeckoApi).then(response => response.json())
			console.log(price.pixels.php)
			await bot.setNickname(`$PIXELS ₱${price.pixels.php}`);
		}, 600000);
		**/

		client.user.setPresence({ activities: [{ name: "$PIXELS/PHP on Binance", type: ActivityType.Watching }], status: "online" });
	},
};
