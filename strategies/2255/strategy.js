/*
 * @coinsori-strategy v1
 * name: SOL SMA200 Trend Ride 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the SMA200+0.3x ATR trend-ride was validated as a robust
 * champion on both ETH and BTC 4h (all walk-forward windows positive and beating
 * buy-and-hold). SOL is a third, higher-volatility asset — this tests whether the
 * same logic transfers to a more volatile coin. Parameters taken verbatim from the
 * BTC champion, nothing tuned for SOL.
 * When it buys and sells: long on a close crossing above the 200-SMA plus 0.3x ATR
 * deadband; sell on a close crossing below the 200-SMA minus 0.3x ATR.
 * When it does NOT work: SOL's higher volatility means deeper drawdowns in violent
 * bull corrections, and the slow SMA exits late in sharp crashes.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  const band = atr != null ? 0.3 * atr : 0;

  if (pos <= 0) {
    if (closePrev2 <= smaP + band && closePrev > sma + band) {
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const risk = 0.02 * cash;
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    if (closePrev < sma - band) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
