/*
 * @coinsori-strategy v1
 * name: BTC Funding-OI Sentiment Contrarian 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Funding rate and open interest capture leverage/crowding
 * that price alone does not. When funding is at an extreme and OI is expanding,
 * the crowd is one-sided — a contrarian fade of that extreme often pays.
 * When it buys and sells: go long when funding flips very negative (crowd
 * short-crowded) with OI rising, and stand aside when funding is very positive
 * (long-crowded, risk of a squeeze down). Exit on a fixed ATR stop or when the
 * trade has run.
 * When it does NOT work: in a sustained one-way trend (esp. a strong bull),
 * fading extended funding keeps you shorting strength; and if funding data is
 * missing the strategy simply does nothing.
 */
function onUpdate(ctx) {
  // funding and OI are futures-only signals; guard every read
  const f = ctx.funding;
  const oi = ctx.binanceOi();
  if (f == null || oi == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const atr = ctx.atr(14, 1);
  if (atr == null || atr <= 0) return null;

  // OI change over 6 bars (1 day of 4h bars) as a fraction
  const oiNow = oi.value != null ? oi.value : (Array.isArray(oi) ? oi[oi.length - 1] : null);
  const oiPrev = Array.isArray(oi) ? oi[Math.max(0, oi.length - 7)] : null;
  if (oiNow == null || oiPrev == null || oiPrev <= 0) return null;
  const oiChg = (oiNow - oiPrev) / oiPrev;

  const fundingPct = f * 100; // funding as a percentage

  if (pos <= 0) {
    // contrarian long: crowd short-crowded (very negative funding) + OI expanding
    if (fundingPct < -0.02 && oiChg > 0.01) {
      // size by ATR: risk 2% of account per trade
      const risk = 0.02 * ctx.cash;
      const qty = Math.min(risk / atr, (ctx.cash / price) * 0.98);
      return { side: 'buy', qty: qty, hardStopMs: 7 * 24 * 3600 * 1000 };
    }
    return null;
  } else {
    // exit: stop-loss at 2.5 ATR, or take profit when funding turns positive
    if (ctx.uPnl < -2.5 * atr * pos || fundingPct > 0.01) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
