/*
 * @coinsori-strategy v1
 * name: BTC Daily 200-SMA Trend Ride ATR
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the 200-SMA trend ride was the most robust idea validated
 * in this job (on ETH 4h it beat buy-and-hold in 3 of 4 disjoint windows with
 * strong downside protection). It simply stays long while price holds above its
 * long-term average and sells when it falls below — no predicting tops or
 * bottoms. On DAILY bars there are very few trades so fees are tiny. Positions
 * are sized by ATR so a volatile market risks the same dollar amount as a calm
 * one, which keeps drawdown under control.
 * When it buys and sells: buy when the daily close crosses above the 200-day
 * average; sell everything when the close crosses below it. Position size =
 * a fixed risk amount divided by the 14-day ATR.
 * When it does NOT work: it stays in cash during long bear markets and misses
 * the first leg of a new bull until the 200-day average turns up. In a strong
 * straight-line bull it lags buy-and-hold because it re-buys late after each
 * pullback.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  if (sma == null || smaP == null) return null;
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    // enter on a confirmed cross above the 200-day average
    if (closePrev2 <= smaP && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      // risk $300 per trade (fixed dollar, same as validated ETH version)
      const riskQty = 300 / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // exit when the close crosses back below the 200-day average
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
