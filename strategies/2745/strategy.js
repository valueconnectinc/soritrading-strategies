/*
 * @coinsori-strategy v1
 * name: Regime-Switch Blend XRP 1D
 * ex: binance
 * syms: XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Two validated families have opposite signatures — Donchian
 * trend-following shines in strong bull regimes, band-bounce mean-reversion is
 * defensive and protects capital in bears. The blend switches between them by
 * the 200-SMA: above it ride the Donchian breakout trend, below it buy panic
 * band-bounces. This exact recipe beat buy-and-hold on ETH and BTC; XRP is a
 * fresh falsification test (pure trend lost -76% here, pure mean-reversion
 * lagged the bull, so the regime-switch logic is what is being tested).
 * When it buys and sells: above the 200-SMA, buys a 20-day-high breakout and
 * exits on a 20-day-low. Below the 200-SMA, buys when price closes below the
 * lower Bollinger(20,2) with RSI<30 and exits at the middle band / RSI>50.
 * When it does NOT work: in a choppy sideways market hugging the 200-SMA the
 * regime flips back and forth and both modes whipsaw; a violent crash that
 * breaks far below the 200-SMA can still lose in the band-bounce mode before
 * mean reversion catches the bottom.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // ---- REGIME: above 200-SMA = trend mode (Donchian breakout) ----
  if (price > sma200) {
    if (pos > 0) {
      // exit trend on a 20-day low (standard Donchian trailing exit)
      const ll20 = ctx.low(20, 1);
      if (ll20 != null && price < ll20) {
        ctx.state.lastExit = ctx.i;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    const lastExit = ctx.state.lastExit || 0;
    if (ctx.i - lastExit < 5) return null;
    // buy a 20-day-high breakout (standard Donchian entry)
    const hh20 = ctx.high(20, 1);
    if (hh20 != null && price > hh20) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- REGIME: below 200-SMA = mean-reversion mode (band-bounce) ----
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (bb == null || rsi == null) return null;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
