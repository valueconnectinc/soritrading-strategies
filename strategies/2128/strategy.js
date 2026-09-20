/*
 * @coinsori-strategy v1
 * name: BTC Regime Adaptive 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC on 4H alternates between ranging (chop) and trending
 * regimes. A single fixed rule gets whipsawed in one regime or the other. This
 * strategy detects the current regime with ATR and switches tactics.
 * When it buys and sells: in a RANGING market it buys when price dips to the
 * lower Bollinger band with RSI oversold and sells back to the middle. In a
 * TRENDING market it rides momentum (EMA cross) and exits on a trailing stop.
 * When it does NOT work: in a fast crash the "buy the dip" rule buys into a
 * falling knife, and the trailing stop gives back gains in a slow grind-up.
 */
function onUpdate(ctx) {
  // ---- regime detection: ATR relative to 60-bar price range ----
  const atr = ctx.atr(14, 1);
  const hi = ctx.high(60, 1);
  const lo = ctx.low(60, 1);
  if (atr == null || hi == null || lo == null) return null;
  const range = hi - lo;
  if (range <= 0) return null;
  const atrRatio = atr / range; // low = ranging, high = trending

  // ---- indicators ----
  const rsi = ctx.rsi(14, 1);
  const bb = ctx.bb(20, 2, 1);
  const emaFast = ctx.ema(9, 1);
  const emaSlow = ctx.ema(21, 1);
  if (rsi == null || bb == null || emaFast == null || emaSlow == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // RANGING regime: mean reversion within the band
  if (atrRatio < 0.12) {
    if (pos <= 0) {
      // buy the dip near lower band with oversold RSI
      if (price <= bb.lower && rsi < 35) {
        ctx.state.trailStop = null;
        return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
      }
    } else {
      // exit back to the middle band
      if (price >= bb.mid) {
        ctx.state.trailStop = null;
        return { side: 'sell', qty: pos };
      }
      // hard stop below entry to cap loss in a surprise drop
      if (ctx.entryPx && price <= ctx.entryPx * 0.94) {
        ctx.state.trailStop = null;
        return { side: 'sell', qty: pos };
      }
    }
    return null;
  }

  // TRENDING regime: momentum with trailing stop
  let stop = ctx.state.trailStop || null;
  if (pos <= 0) {
    // enter on EMA fast crossing above slow
    const emaFastP = ctx.ema(9, 2);
    const emaSlowP = ctx.ema(21, 2);
    if (emaFastP != null && emaSlowP != null &&
        emaFastP <= emaSlowP && emaFast > emaSlow) {
      ctx.state.trailStop = null;
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // trailing stop: ratchet up, never down
    if (stop == null || price > stop) {
      stop = price * 0.94;
      ctx.state.trailStop = stop;
    }
    if (price <= stop) {
      ctx.state.trailStop = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
