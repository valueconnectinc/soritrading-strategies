/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI Zone — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The first version used EMA(200) as a broad trend filter
 * which was too restrictive — BTC rarely strays below its 200-EMA on 4H.
 * This version drops EMA(200) and instead uses a wider RSI zone (35-75) to
 * avoid exhausted entries, plus a lower take-profit (6%) to lock in gains
 * faster. Entry: EMA(9) crosses EMA(50) + volume + RSI in 35-75 zone.
 *
 * When it buys: EMA(9) golden cross EMA(50) + above-avg volume + RSI 35-75.
 * When it sells: EMA(9) death cross OR +6% take-profit OR RSI > 75.
 *
 * When it does NOT work: In strong trends, the RSI 75 ceiling exits early.
 * In choppy markets, EMA crossovers whipsaw despite the RSI filter.
 */
function onUpdate(ctx) {
  const ema9  = ctx.ema(9);
  const ema50 = ctx.ema(50);
  if (ema9 == null || ema50 == null) return null;

  const ema9P  = ctx.ema(9, 1);
  const ema50P = ctx.ema(50, 1);
  if (ema9P == null || ema50P == null) return null;

  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volConfirm = ctx.vol > avgVol;

  const price    = ctx.price;
  const position = ctx.position;

  // ENTRY: EMA golden cross + RSI zone + volume
  if (!position) {
    const crossUp  = ema9P <= ema50P && ema9 > ema50;
    // RSI 35-75: avoid oversold (too early) and overbought (exhausted)
    const rsiZone  = rsi > 35 && rsi < 75;

    if (crossUp && rsiZone && volConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99, type: 'market' };
    }
  }

  // EXIT: death cross OR take-profit OR RSI overbought
  if (position) {
    const crossDown  = ema9P >= ema50P && ema9 < ema50;
    const rsiHot    = rsi > 75;
    const pnlPct    = (price - ctx.entryPx) / ctx.entryPx;
    const takeProfit = pnlPct >= 0.06;

    if (crossDown || rsiHot || takeProfit) {
      return { side: 'sell', qty: position, type: 'market' };
    }
  }

  return null;
}
