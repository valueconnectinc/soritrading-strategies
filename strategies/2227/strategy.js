/*
 * @coinsori-strategy v1
 * name: ETH Daily Trend-Strength Ride 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: SOL's high drawdown (40-64%) is inherent and unfixable —
 * every timing filter tried destroyed more return than it saved. ETH on the
 * daily chart is structurally different: a 200-SMA trend gate with
 * trend-strength-scaled sizing showed a much lower drawdown (30% recent window)
 * while still beating buy-and-hold. This is a lower-risk family than SOL.
 * When it buys and sells: long on a daily close above the 200-SMA, sell on a
 * close below it. Position size scales with how far price is above the SMA
 * (strong trend = bigger position, capped), so we under-deploy in weak chop and
 * ride the full account in a clean bull.
 * When it does NOT work: in sideways chop the 200-SMA whipsaws (buy late into
 * rallies, sell late into dips); in a parabolic bull it exits on the first
 * meaningful dip and re-enters late, so it underperforms buy-and-hold in the
 * strongest melt-ups.
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
