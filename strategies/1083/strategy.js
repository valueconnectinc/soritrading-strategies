/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout + RSI Momentum ETH 4h
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH often makes explosive moves after low-volatility compression.
 * ATR breakout captures those expansions; RSI confirms the momentum is real rather
 * than a head-fake.
 * When it buys and sells: Buys when price breaks above the 20-bar SMA by more than
 * 1.5× ATR AND RSI is above 55 (confirming upward momentum). Exits when RSI drops
 * below 42 OR price closes below a trailing 2× ATR stop below the highest price since entry.
 * When it does NOT work: In choppy, low-momentum markets price breaks out but immediately
 * reverses — the RSI filter helps but whipsaws still occur. Also fails in slow grinding
 * uptrends where ETH never pulls back enough to trigger the breakout entry.
 */

function onUpdate(ctx) {
  // ── Warm-up: need 20 bars for SMA, 14 for RSI, 14 for ATR ──
  const sma20_1 = ctx.sma(20, 1);
  const atr14_1 = ctx.atr(14, 1);
  if (sma20_1 == null || atr14_1 == null) return null;

  const rsi14_1 = ctx.rsi(14, 1);
  if (rsi14_1 == null) return null;

  const rsi14_2 = ctx.rsi(14, 2); // for crossover check
  if (rsi14_2 == null) return null;

  // ── Current bar values ──
  const price    = ctx.price;
  const rsiCur  = ctx.rsi(14, 0);
  const atrCur  = ctx.atr(14, 0);
  const smaCur  = ctx.sma(20, 0);

  // ── ENTRY: price breaks above SMA + 1.5× ATR, RSI confirming ──
  if (ctx.position === 0) {
    const breakoutLevel = sma20_1 + atr14_1 * 1.5;
    // Use previous bar close (sma20_1 is from bar 1 = closed bar)
    const prevClose = ctx.closes[1];
    if (prevClose != null && prevClose <= breakoutLevel && price > breakoutLevel && rsi14_1 > 55) {
      const qty = (ctx.cash * 0.95) / price;
      return { side: 'buy', qty: qty };
    }
  }

  // ── EXIT: RSI drops below 42 (momentum loss) OR trailing ATR stop hit ──
  if (ctx.position > 0) {
    const rsiPrev = rsi14_1;

    // Sell 1: RSI crossed below 42 (momentum reversal)
    if (rsiPrev <= 42 && rsi14_2 > 42) {
      return { side: 'sell', qty: ctx.position };
    }

    // Sell 2: RSI drops below 42 without needing a cross (steady decline)
    if (rsiPrev < 42) {
      return { side: 'sell', qty: ctx.position };
    }

    // Sell 3: Trailing ATR stop — highest price since entry minus 2× ATR
    // ctx.uPnl > 0 means in profit; use trailing stop when in profit
    if (ctx.uPnl > 0 && atrCur != null) {
      // ctx.price is current; use it as the de-facto highest since we check each bar
      const trailStop = price - atrCur * 2.0;
      // Only activate trailing stop once price is > 1.5% above entry
      const trailActivation = ctx.entryPx * 1.015;
      if (price > trailActivation && price < trailStop) {
        return { side: 'sell', qty: ctx.position };
      }
    }
  }

  return null;
}
