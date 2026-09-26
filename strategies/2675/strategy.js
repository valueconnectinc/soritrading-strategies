/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion EOS 4H (Rising-SMA)
 * ex: binance
 * syms: EOSUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated band-bounce mean-reversion champion, plus one
 * targeted fix for its known weakness. The champion loses on secular decliners
 * (EOS/ALGO) where price is above a FLAT or falling 200-SMA and then collapses.
 * Requiring the 200-SMA itself to be RISING filters out those early-stage
 * downtrends, keeping only the ranging/recovering regimes where mean reversion
 * works. Testing this only on EOS, the champion's weakest asset.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * with RSI<30, the 200-SMA is rising, and price is above it; exits at the middle
 * band / RSI>50 or a stop; waits 5 bars before the next entry.
 * When it does NOT work: lags strong melt-ups (sits in cash during rallies);
 * the rising-SMA filter may be too strict and skip valid early recoveries.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200p = ctx.sma(200, 2);
  if (bb == null || rsi == null || sma200 == null || sma200p == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

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

  // NEW: require the 200-SMA to be rising (slope up) — filters secular decliners
  if (sma200 <= sma200p) return null;
  if (price < sma200) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
