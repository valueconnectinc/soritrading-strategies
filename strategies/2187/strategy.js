/*
 * @coinsori-strategy v1
 * name: BTC Relative-Strength Gated Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's own 200-day trend is a solid filter, but adding
 * a RELATIVE-STRENGTH gate — only buying when BTC's trailing momentum is not
 * materially weaker than ETH's — keeps us in BTC when it is holding its own
 * against the crypto market and out when it is clearly lagging. The gate is
 * lenient (BTC within 5% of ETH's 30-day momentum) because ETH has a higher
 * beta and naturally overshoots in rallies, so a strict BTC>ETH test blocks
 * almost every bull entry.
 * When it buys and sells: buy when BTC closes above its 200-day average AND
 * BTC's 30-day return is at least 5% below ETH's 30-day return. Sell when BTC
 * closes below its 200-day average or when BTC's relative momentum turns
 * clearly negative (BTC more than 5% below ETH).
 * When it does NOT work: when BTC and ETH move together (high correlation) the
 * gate rarely changes the answer; it whipsaws during altcoin-led phases where
 * ETH clearly outperforms BTC, and ETH's higher volatility can make the gate
 * exit BTC just before a BTC-led resume.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (sma == null || closePrev == null) return null;

  const n = ctx.closes.length;
  if (n < 32) return null;
  const btcNow = ctx.closes[n - 2];
  const btc30 = ctx.closes[n - 32];
  if (btcNow == null || btc30 == null || btc30 <= 0) return null;
  const btcMom = (btcNow - btc30) / btc30;

  const eth = ctx.market('ETHUSDT');
  let gateOk = true;
  if (eth != null) {
    const en = eth.closes.length;
    if (en >= 32) {
      const ethNow = eth.closes[en - 2];
      const eth30 = eth.closes[en - 32];
      if (ethNow != null && eth30 != null && eth30 > 0) {
        const ethMom = (ethNow - eth30) / eth30;
        gateOk = btcMom > ethMom - 0.05; // lenient: BTC within 5% of ETH momentum
      }
    }
  }

  const aboveSma = closePrev > sma;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (price == null || cash == null) return null;
    if (aboveSma && gateOk) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    if (!aboveSma || !gateOk) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
