/*
 * @coinsori-strategy v1
 * name: EMA 9/21 Crossover + RSI ATR Volume Confirm — SOLUSDT 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA 9/21 crossover catches medium-term trend shifts on SOL — fast enough to capture altcoin momentum bursts, filtered by RSI/ATR/volume to avoid whipsaws in ranging markets.
 * When it buys and sells: Buy when EMA 9 crosses above EMA 21 AND RSI(14) > 50 (momentum confirmed) AND ATR is rising (volatility increasing) AND volume > 20-bar average (participation confirmed). Sell when EMA 9 crosses below EMA 21.
 * When it does NOT work: In choppy markets where EMAs cross repeatedly — each cross triggers fees and small losses. Also fails at market tops where the crossover fires late after the biggest move is already over.
 */
function onUpdate(ctx) {
  // Need enough bars for EMAs, RSI, ATR, and volume
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const ema9_1  = ctx.ema(9, 1);
  const ema21_1 = ctx.ema(21, 1);
  if (ema9 == null || ema21 == null || ema9_1 == null || ema21_1 == null) return null;

  const rsi   = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  const atr   = ctx.atr(14);
  const atr_1 = ctx.atr(14, 1);
  if (atr == null || atr_1 == null) return null;

  // Volume confirm: current vol > 20-bar average
  const avgVol = ctx.avgVol(20);
  if (avgVol == null || ctx.vol == null) return null;

  const position = ctx.position;

  // BUY: EMA 9 crosses above EMA 21, RSI > 50, ATR rising, volume confirm
  const emaBullCross = ema9_1 <= ema21_1 && ema9 > ema21;
  const rsiConfirm   = rsi > 50;
  const atrRising    = atr > atr_1;
  const volConfirm   = ctx.vol > avgVol;

  if (emaBullCross && rsiConfirm && atrRising && volConfirm && position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: EMA 9 crosses below EMA 21 (trend reversal)
  const emaBearCross = ema9_1 >= ema21_1 && ema9 < ema21;
  if (emaBearCross && position > 0) {
    return { side: 'sell', qty: position };
  }

  return null;
}
