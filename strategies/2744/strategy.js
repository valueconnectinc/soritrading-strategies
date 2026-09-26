/*
 * @coinsori-strategy v1
 * name: ETH Regime-Switch Trend+MeanReversion 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The two validated families have complementary signatures —
 * band-bounce mean-reversion is defensive (beats hold in bears, lags melt-ups)
 * and Donchian trend-following shines in strong bull trends. Both are validated
 * on ETH 1d. This blends them by regime: ride the trend when a Donchian breakout
 * is active, otherwise buy panic dips with the band-bounce rule.
 * When it buys and sells: flat + above 200-SMA → if 55-day high breaks, enter
 * trend mode (exit on 30-day low break or 6-ATR stop); else if close < lower
 * Bollinger(20,2) with RSI<30, enter mean-reversion mode (exit at mid-band,
 * RSI>50, or 6-ATR stop). 5-bar cooldown after any exit.
 * When it does NOT work: below the 200-SMA it never buys, so a deep bear loses
 * nothing but also misses the recovery start; a choppy sideways market above the
 * SMA whipsaws both modes. Trend mode gives back gains in sharp reversals.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || atr == null) return null;

  // Donchian channels from closed bars only (ago>=1)
  const hh55Prev = ctx.high(55, 2);
  const hh55Cur = ctx.high(55, 1);
  const ll30Prev = ctx.low(30, 2);
  const ll30Cur = ctx.low(30, 1);
  if (hh55Prev == null || hh55Cur == null || ll30Prev == null || ll30Cur == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const mode = ctx.state.mode || 'flat';

  const breakout = hh55Cur > hh55Prev && price > sma200;   // new 55d high above the SMA gate
  const brokeDown = ll30Cur < ll30Prev;                    // new 30d low = trend exit

  if (pos > 0) {
    if (mode === 'trend') {
      if (brokeDown || price <= ctx.entryPx - atr * 6) {
        ctx.state.mode = 'flat';
        ctx.state.lastExit = ctx.i;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // mean-reversion position: exit at the middle band or RSI fading or hard stop
    if (price >= bb.mid || rsi > 50 || price <= ctx.entryPx - atr * 6) {
      ctx.state.mode = 'flat';
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;   // cooldown — avoids re-buying the same dip

  if (price < sma200) return null;         // never buy below the long-term trend

  if (breakout) {
    ctx.state.mode = 'trend';
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  if (price < bb.lower && rsi < 30) {
    ctx.state.mode = 'mr';
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
