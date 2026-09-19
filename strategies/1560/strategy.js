/*
 * @coinsori-strategy v1
 * name: Fast EMA Crossover + Volume + ATR Take-Profit — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Builds on strategy 1241 (SMA 20/50 crossover + volume)
 * which beat the market in 2 of 3 walk-forward windows with low MDD (5.6%).
 * This version uses faster EMAs (8,21) for more signals and adds an ATR-based
 * take-profit to lock in gains before the trend reverses — the original
 * lost 21pp vs bench in the bull window.
 * When it buys and sells: Buys on EMA(8) crossing above EMA(21) with volume
 * confirmation. Sells on bear cross OR when price reaches entry + 4× ATR (take profit).
 * When it does NOT work: In volatile chop where price oscillates around the
 * EMA bands — take-profit hits repeatedly but the next candle reverses, giving
 * back small gains before a real trend arrives.
 */
function onUpdate(ctx) {
  const ema8  = ctx.ema(8);
  const ema21 = ctx.ema(21);
  if (ema8 == null || ema21 == null) return null;

  const e8p  = ctx.ema(8,  1);
  const e21p = ctx.ema(21, 1);
  if (e8p == null || e21p == null) return null;

  // Volume confirmation: today's volume above its 20-bar average
  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volConfirm = ctx.vol > avgVol;

  const position = ctx.position;
  const price    = ctx.price;

  // ── ENTRY: fast EMA golden cross + volume confirm ──────────────────
  if (!position) {
    const crossUp = e8p <= e21p && ema8 > ema21;
    if (crossUp && volConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── EXIT: EMA death cross OR ATR-based take-profit ──────────────────
  if (position) {
    const crossDown = e8p >= e21p && ema8 < ema21;

    // Take profit: price moved entry + 4× ATR
    const atr = ctx.atr(14);
    let takeProfit = false;
    if (atr != null && ctx.entryPx != null) {
      takeProfit = price >= ctx.entryPx + 4 * atr;
    }

    if (crossDown || takeProfit) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
