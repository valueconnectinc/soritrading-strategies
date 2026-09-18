/*
 * @coinsori-strategy v1
 * name: EMA Cross + Volume Confirm
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Simple EMA(20)/EMA(60) crossover with volume confirmation.
 * Buys when fast EMA crosses above slow EMA AND volume spikes above 1.2× average.
 * Sells when fast crosses below slow OR after 8 bars in trade (time exit).
 * Why this strategy: EMAs smooth noise and catch medium-term trends; volume
 * confirmation filters fake breakouts common in crypto.
 * When it buys and sells: Enter on confirmed EMA bullish crossover with volume.
 * Exit on opposite crossover or automatically after 8 bars.
 * When it does NOT work: Ranging markets with no clear trend produce whipsaws.
 * Also fails in sharp one-directional moves where EMAs lag entry.
 */

// Track entry bar (closure — persists across onUpdate calls within same backtest)
let _entryBar = null;

function onUpdate(ctx) {
  const fast = 20, slow = 60;
  const volMult = 1.2;
  const exitBars = 8;
  const warmup = slow + 2;

  if (ctx.i < warmup) return null;

  const emaF  = ctx.ema(fast);
  const emaS  = ctx.ema(slow);
  const emaF1 = ctx.ema(fast, 1);
  const emaS1 = ctx.ema(slow, 1);
  if (emaF == null || emaS == null || emaF1 == null || emaS1 == null) return null;

  const avgVol = ctx.avgVol(20);
  if (avgVol == null || avgVol === 0) return null;
  const volOk = ctx.vol > avgVol * volMult;

  // ── BUY: bullish EMA crossover + volume confirmation ──
  if (emaF1 <= emaS1 && emaF > emaS && volOk && ctx.position <= 0) {
    _entryBar = ctx.i;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── SELL: bearish EMA crossover ──
  if (emaF1 >= emaS1 && emaF < emaS && ctx.position > 0) {
    _entryBar = null;
    return { side: 'sell', qty: ctx.position };
  }

  // ── Time exit: close after exitBars bars in position ──
  if (ctx.position > 0 && _entryBar !== null) {
    const barsInTrade = ctx.i - _entryBar;
    if (barsInTrade >= exitBars) {
      _entryBar = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
