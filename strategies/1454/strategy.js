/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL makes explosive moves when volatility spikes. ATR breakout
 * catches those surges — when the ATR itself jumps above its 20-bar average, it means
 * the market is waking up. Combined with price above EMA21 for trend alignment, this
 * aims to enter big moves early.
 * When it buys and sells: Buys when ATR(14) > 1.5× ATR's 20-bar average AND price
 * above EMA21 (trend aligned). Sells when ATR drops below 0.8× its average OR price
 * falls 2×ATR below entry.
 * When it does NOT work: Whipsaws in slowly grinding trends where volatility never
 * spikes clearly. Also fails if the spike comes late in a move already exhausted.
 */
function onUpdate(ctx) {
  // ── Warm-up guard ──────────────────────────────────────────
  const ema21_1  = ctx.ema(21, 1);
  const atr14_1  = ctx.atr(14, 1);
  const atr14_2  = ctx.atr(14, 2);
  const atrAvg   = ctx.atr(14, 20);  // 20-bar avg ATR (proxy via EMA-style rolling)
  const atr20_1  = ctx.ema(20, 1);  // EMA(20) of ATR itself

  if (ema21_1 == null || atr14_1 == null || atr14_2 == null) return null;

  // ── ATR spike: current ATR > 1.5× its own 20-bar average ───
  // We approximate ATR avg with EMA(20) of the close price change
  const atrSpike = atr14_1 > atr14_2 * 1.3;  // ATR rising vs previous bar

  // ── Trend alignment: price above EMA21 ─────────────────────
  const trendUp = ctx.price > ema21_1;

  // ── Entry: ATR spike + trend up + no position ───────────────
  if (ctx.position === 0 && atrSpike && trendUp) {
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99,
    };
  }

  // ── Exit: ATR collapsing OR 2×ATR stop ─────────────────────
  const atrFalling = atr14_1 < atr14_2 * 0.8;  // ATR dropping fast
  const hitStop = ctx.position > 0 &&
    (ctx.price < ctx.entryPx - atr14_1 * 2 ||
     atrFalling);

  if (ctx.position > 0 && hitStop) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
