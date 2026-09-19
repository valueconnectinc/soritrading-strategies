/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion ATR Gate
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bollinger Bands define statistical extremes; RSI confirms
 * oversold/overbought. ATR gate filters choppy low-vol periods that cause whipsaws.
 * Mean-reversion only (no shorting) avoids the fatal "fade the uptrend" trap.
 * When it buys and sells: Buy when price pierces the lower Bollinger Band AND RSI < 35
 * AND ATR is rising (volatility expanding). Sell when price reaches the mid BB OR RSI > 65.
 * When it does NOT work: Strong trending markets where price rides the lower band for
 * weeks — the strategy exits too early and misses the full move. Also fails in
 * low-volume illiquid conditions where ATR signal is unreliable.
 */
function onUpdate(ctx) {
  const period = 20;
  const bbDev = 2;
  const rsiN = 14;
  const atrN = 14;
  const atrMult = 0.7;

  // ATR filter — avoid entries when vol is too low (chop)
  const atr = ctx.atr(atrN);
  if (atr == null) return null;
  const atrPrev = ctx.atr(atrN, 1);
  if (atrPrev == null) return null;
  const atrRising = atr > atrPrev * 1.0; // ATR expanding = trending, not chop

  const bb = ctx.bb(period, bbDev);
  if (bb == null) return null;
  const mid = bb.mid;
  const lower = bb.lower;
  const upper = bb.upper;
  const price = ctx.price;

  const rsi = ctx.rsi(rsiN);
  if (rsi == null) return null;

  // Entry: price at or below lower BB AND RSI < 35 AND ATR expanding
  const atLowerBand = price <= lower * 1.01;
  const oversold = rsi < 35;
  const buySignal = atLowerBand && oversold && atrRising;

  // Exit: price reaches mid BB OR RSI > 65
  const atMidBand = price >= mid;
  const overbought = rsi > 65;
  const sellSignal = atMidBand || overbought;

  // Position management
  const hasPosition = ctx.position > 0;
  const cash = ctx.cash;
  const entryPx = ctx.entryPx || price;

  // ATR-based stop loss — 2.5× ATR from entry
  const atrStop = atr * 2.5;
  const stopPx = entryPx * (1 - 0.025 * (atrStop / entryPx));
  const hitStop = price <= stopPx && hasPosition;

  // ATR-based take profit — price near mid band
  const tpPx = mid * 0.995;
  const hitTP = hasPosition && price >= tpPx;

  if (!hasPosition && buySignal) {
    // Market buy with ~99% of cash
    return { side: 'buy', qty: cash / price * 0.99, type: 'market' };
  }

  if (hasPosition && (sellSignal || hitStop || hitTP)) {
    return { side: 'sell', qty: ctx.position, type: 'market' };
  }

  return null;
}
