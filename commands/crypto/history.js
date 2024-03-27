// code from https://github.com/BlueSkunka/forge-crypto
const rp = require("request-promise");
const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const DEFAULT_COIN = "pixels";
const DEFAULT_CONVERT = "php";
const DEFAULT_PERIOD_1_DAY = 60 * 60 * 24;
const DEFAULT_PERIOD_7_DAY = DEFAULT_PERIOD_1_DAY * 7;
const DEFAULT_PERIOD_14_DAY = DEFAULT_PERIOD_1_DAY * 14;
const DEFAULT_PERIOD_30_DAY = DEFAULT_PERIOD_1_DAY * 30;
const DEFAULT_PERIOD = DEFAULT_PERIOD_1_DAY;
const COINGECKO_API = "https://api.coingecko.com/api/v3/coins/__id__/market_chart/range";
let chartEmbed = {};
let coinData = {};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription(
      "Generate graphic from coin historical data"
    )
    .addStringOption((option) =>
      option
        .setName("symbol")
        .setDescription(
          "Insert a crypto currency symbol like 'pixels' or with pairing 'pixels/php'. Default pairing: php"
        )
    )
    .addStringOption((option) =>
      option
        .setName("period")
        .setDescription("Define the period to fetch coin data")
        .setRequired(false)
        .addChoices(
            {name: "1 day", value: DEFAULT_PERIOD_1_DAY.toString()},
            {name: "7 days", value: DEFAULT_PERIOD_7_DAY.toString()},
            {name: "14 days", value: DEFAULT_PERIOD_14_DAY.toString()},
            {name: "30 days", value: DEFAULT_PERIOD_30_DAY.toString()},
            )
    ),

  async execute(interaction) {
    const pairing = !interaction.options.getString("symbol")
      ? ""
      : interaction.options.getString("symbol").trim().split("/");

    const symbol = !pairing[0] ? DEFAULT_COIN : pairing[0];
    const convert = !pairing[1] ? DEFAULT_CONVERT : pairing[1];
    const to = Date.now() / 1000;
    const period = !interaction.options.getString("period")
      ? DEFAULT_PERIOD
      : interaction.options.getString("period");
    const from = to - period;
    const requestOptions = {
      method: "GET",
      uri: COINGECKO_API.replace(/__id__/g, symbol),
      qs: {
        vs_currency: convert,
        from: from,
        to: to,
      },
      headers: {
        "Content-Type": "application/json",
      },
      json: true,
    };

    await rp(requestOptions)
      .then((response) => {
        coinData = response["prices"];
      })
      .catch((err) => {
        console.log("API call error:", err.message);
        interaction.reply(err.message);
        return;
      });

    let labels = [];
    let data = [];

    for (let i = 0; i < coinData.length; i++) {
      let date = new Date(coinData[i][0]);

      if (period === DEFAULT_PERIOD_1_DAY) {
        labels.push(date.getHours() + "h" + date.getMinutes());
      } else {
        labels.push(
          date.getDate() +
          "-" +
          (date.getMonth() + 1) +
          "-" +
          date.getFullYear()
        );
      }

      data.push(coinData[i][1]);
    }

    const generateCanva = async (labels, datas, convert) => {
      const renderer = new ChartJSNodeCanvas({
        type: "png",
        width: 1600,
        height: 600,
        backgroundColour: "#333333",
      });
      const image = await renderer.renderToBuffer({
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: convert,
              data: datas,
              backgroundColor: "#)=ecc501",
              borderColor: "#ecc501",
              yAxisID: 'right-y-axis',
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              ticks: {
                callback: function (val, index) {
                  switch (period) {
                    case DEFAULT_PERIOD_7_DAY:
                      return index % 7 === 0 ? this.getLabelForValue(val) : "";
                      break;
                    case DEFAULT_PERIOD_14_DAY:
                      return index % 14 === 0 ? this.getLabelForValue(val) : "";
                      break;
                    case DEFAULT_PERIOD_30_DAY:
                      return index % 30 === 0 ? this.getLabelForValue(val) : "";
                      break;
                    default:
                      return index % 3 === 0 ? this.getLabelForValue(val) : "";
                      break;
                  }
                },
              },
            },
            'right-y-axis': {
              position: 'right',
            }
          },
          elements: {
            point: {
              radius: 0,
            },
          },
        },
      });
      return new AttachmentBuilder(image, "graph.png");
    };

    chartEmbed = new EmbedBuilder ({
      title: symbol + "/" + convert,
      color: "16776960",
    });
    chartEmbed.setImage("attachment://graph.png");
    const attachment = await generateCanva(labels, data, convert);
    const getTitle = async () => {
      let min = coinData[0][1];
      let max = coinData[coinData.length - 1][1];
      let percent = ((max - min) * 100) / max;
      let sign = "";
      if (Math.sign(percent) > 0) sign = "\u200E +";
      if (Math.sign(percent) < 0) sign = "\u200E -";
      return (
        sign +
        " " +
        Math.round(Math.abs(percent) * 100) / 100 +
        "% in " +
        period / 86400 +
        " day/s"
      );
    };
    chartEmbed.setDescription(await getTitle());

    interaction.reply({ embeds: [chartEmbed], files: [attachment] });

  },
};