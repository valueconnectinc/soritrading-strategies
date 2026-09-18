/*
 * @coinsori-strategy v1
 * name: Dual Oscillator + EMA200 + ATR Gate
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Combines the best of two approaches: EMA200 trend filter (proven MDD protection
 * from id:279) + ATR volatility gate (proven return boost in id:1208). Entry only
 * when: (1) RSI < 35 AND Stoch %K < 25 (dual oversold), (2) price > EMA200
 * (bullish trend), (3) ATR > 1.5% (enough volatility for the signal to matter).
 * Exit: RSI > 60 OR Stoch %K > 65.
 *
 * Fails in strong bear markets where all three conditions rarely align — the
 * tight filters mean fewer trades and missed opportunities in early recovery.
 */

function onUpdate(ctx) {
  const rsi  = ctx.rsi(14);
  const stoch = ctx.stoch(14, 3);
  const atr   = ctx.atr(14);
  const ema200 = ctx.ema(200);
  const price  = ctx.price;

  if (rsi == null || stoch == null || atr == null || ema200 == null) return null;

  // ATR gate: skip low-volatility chop
  const atrPct = (atr / price) * 100;
  if (atrPct < 1.5) return null;

  // Entry: dual oversold + EMA200 uptrend + enough volatility
  if (ctx.position === 0 && rsi < 35 && stoch.k < 25 && price > ema200) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Exit: either oscillator reaches overbought
  if (ctx.position > 0 && (rsi > 60 || stoch.k > 65)) {
    return { side: 'sell', qty: ctx.position };
  }
}
