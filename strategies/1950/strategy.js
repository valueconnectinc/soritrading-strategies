/*
 * @coinsori-strategy v1
 * name: EMA Trend Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: Trend-following captures directional moves that mean-reversion
 * misses (the VWAP strategy returned 0% during a +20.55% BTC window). EMA crossovers
 * catch the beginning of trends; ATR rising filters out sideways noise.
 * When it buys and sells: Buys when EMA9 crosses above EMA21 AND ATR is rising
 * (confirming a real trend, not a whipsaw). Sells when the reverse crossover
 * or ATR stops rising (trend losing steam).
 * When it does NOT work: Choppy markets — EMA crosses back and forth, generating
 * losing trades with no clear trend.
 */
function onUpdate(ctx) {
  const emaFast  = ctx.ema(9);
  const emaSlow  = ctx.ema(21);
  const atr      = ctx.atr(14);
  const emaFast1 = ctx.ema(9, 1);
  const emaSlow1 = ctx.ema(21, 1);
  const atr1     = ctx.atr(14, 1);

  if (emaFast == null || emaSlow == null || atr == null ||
      emaFast1 == null || emaSlow1 == null || atr1 == null) return null;

  // ATR rising = volatility increasing, typical of trend development
  const atrRising = atr > atr1;

  // --- ENTRY: EMA bullish crossover + ATR confirming momentum ---
  if (ctx.position === 0) {
    if (emaFast1 <= emaSlow1 && emaFast > emaSlow && atrRising) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // --- EXIT: EMA bearish crossover OR ATR stalling ---
  if (ctx.position > 0) {
    // Bearish EMA crossover — trend is reversing
    if (emaFast1 > emaSlow1 && emaFast < emaSlow) {
      return { side: 'sell', qty: ctx.position };
    }
    // ATR stops rising = momentum fading
    if (atr <= atr1) {
      return { side: 'sell', qty: ctx.position };
    }
    // Hard time stop: hold > 96 bars (4 days at 1H)
    if (ctx.candle && ctx.candle.holdBars && ctx.candle.holdBars > 96) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
