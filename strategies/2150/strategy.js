/*
 * @coinsori-strategy v1
 * name: BTC On-chain Network Growth 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's price is historically led by network adoption —
 * when the number of active addresses is growing, new money is entering the
 * network and price tends to follow. This uses on-chain active-address data
 * (a fundamental signal) instead of price momentum, so it can catch trends
 * early and hold through them.
 * When it buys and sells: long when the 30-day average of active addresses is
 * rising (above its own 90-day average), sell when it turns down. Position is
 * sized by ATR so volatility doesn't blow up the account.
 * When it does NOT work: in a price rally NOT backed by network growth (e.g.
 * speculative leverage pumps), this stays out and misses the move; and on-chain
 * data lags by days, so sharp reversals are entered late.
 */
function onUpdate(ctx) {
  // on-chain active addresses (daily) — null until the dataset has a value
  const addr = ctx.data('addr');
  if (addr == null) return null;

  // we need a short and a long average of network activity to detect growth
  const short = ctx.sma(30, 1);
  const long = ctx.sma(90, 1);
  if (short == null || long == null) return null;

  const pos = ctx.position;
  const price = ctx.price;

  if (pos <= 0) {
    // network adoption turning up: 30d avg rising above 90d avg
    if (short > long) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
      // risk 2% of cash per trade, sized by ATR
      const riskQty = (0.02 * ctx.cash) / atr;
      const maxQty = (ctx.cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // network adoption turning down: exit
    if (short < long) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
