/*
 * @coinsori-strategy v1
 * name: BTC Daily Trend-Strength Ride 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ETH daily 200-SMA trend-strength ride (champion 2216)
 * beat buy-and-hold on all 3 walk-forward windows with lower drawdown than a
 * pure hold. This tests whether that exact edge generalizes to BTC — if it does,
 * it is a robust family, not an ETH-specific artifact.
 * When it buys and sells: long on a daily close above the 200-SMA (fresh cross),
 * sell on a close below it. Size scales with how far price is above the SMA.
 * When it does NOT work: in sideways chop the 200-SMA whipsaws; in a parabolic
 * bull it exits on the first dip and re-enters late, underperforming buy-and-hold
 * in the strongest melt-ups.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const distPct = (closePrev - sma) / sma;
      const risk = 300 + Math.min(Math.max(distPct * 20000, 0), 1200);
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
