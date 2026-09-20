/*
 * @coinsori-strategy v1
 * name: BTC Trend Strength-Scaled Size 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the same 200-SMA trend ride + trend-strength risk scaling
 * that validated well on ETH, applied to BTC to test whether the edge
 * generalizes. BTC trends are long and persistent, and scaling risk up in
 * strong trends captures more of the move while ATR sizing protects downside.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position = risk / ATR, where risk grows with how far price is
 * above the SMA (capped so we never risk more than a fixed fraction of cash).
 * When it does NOT work: sideways chop whipsaws the 200-SMA cross; scaling risk
 * up on a strong-looking but false breakout loses more than flat sizing.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
      const distPct = (closePrev - sma) / sma;
      const risk = 300 + Math.min(Math.max(distPct * 20000, 0), 1200);
      const riskQty = risk / atr;
      const maxQty = (ctx.cash / price) * 0.98;
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
