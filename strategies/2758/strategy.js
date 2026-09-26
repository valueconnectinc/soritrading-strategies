/*
 * @coinsori-strategy v1
 * name: Regime-Switch Blend ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A regime-switch that combines two validated families. In
 * a confirmed uptrend (price above a rising 200-SMA) it rides the trend with a
 * Donchian breakout; below the 200-SMA it switches to mean-reversion, buying
 * panic dips back to the lower Bollinger band. Bet: different market regimes
 * reward different behaviours, so switching between them beats one fixed rule.
 * When it buys and sells: above the rising 200-SMA, buy a close above the
 * 55-bar high, sell below the 20-bar low. Below the 200-SMA, buy a dip to the
 * lower Bollinger band with RSI<30, sell back at the middle band.
 * When it does NOT work: in a sideways market where the 200-SMA is flat it
 * whipsaws between modes; the trend mode lags the start of a melt-up and the
 * reversion mode can catch falling knives in a sustained bear.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // ---- TREND MODE: price above the 200-SMA ----
  if (price > sma200) {
    const hi55 = ctx.high(55, 1);
    const lo20 = ctx.low(20, 1);
    if (hi55 == null || lo20 == null) return null;
    if (pos > 0) {
      if (price < lo20) return { side: 'sell', qty: pos };
      return null;
    }
    if (price > hi55) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  // ---- MEAN-REVERSION MODE: price below the 200-SMA ----
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (bb == null || bb.lower == null || rsi == null) return null;
  if (pos > 0) {
    if (price >= bb.mid) return { side: 'sell', qty: pos };
    return null;
  }
  // buy a deep dip to the lower band with oversold RSI
  if (price <= bb.lower * 1.01 && rsi < 30) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
