/*
 * @coinsori-strategy v1
 * name: XRP Trend Rider
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 1000
 *
 * Trend-following momentum strategy. Bet: liquid altcoins in a confirmed
 * uptrend tend to keep trending, and a volatility filter avoids choppy
 * low-momentum periods.
 * When it buys: fast EMA crosses above slow EMA while price is above the
 * long-term EMA and volatility (ATR) is not too low (so there is real movement).
 * When it sells: fast EMA crosses back below slow EMA, or price falls below
 * the long-term EMA (trend broken).
 * When it does NOT work: sideways chop where EMAs whipsaw and fees eat the
 * small moves; also sharp trend reversals where the exit lags.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(20, 1), slow = ctx.ema(55, 1), trend = ctx.ema(200, 1);
  const fastPrev = ctx.ema(20, 2), slowPrev = ctx.ema(55, 2);
  const atr = ctx.atr(14, 1);
  if (fast == null || slow == null || trend == null || fastPrev == null || slowPrev == null || atr == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0;

  // Volatility filter: only trade when ATR is meaningful relative to price
  // (avoid dead low-momentum chop). Threshold 1.2% of price.
  const atrPct = atr / px;
  const volOk = atrPct > 0.012;

  // Bullish cross while above the long-term trend EMA
  if (pos === 0 && volOk && px > trend && fastPrev <= slowPrev && fast > slow) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Exit: bearish cross or trend break
  if (pos > 0 && (fast < slow || px < trend)) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
