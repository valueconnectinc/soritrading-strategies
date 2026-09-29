/*
 * @coinsori-strategy v1
 * name: BTC 1D Defensive MR + Slow Melt-up Capture
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ledger shows defensive mean reversion is the ONLY validated
 * edge on BTC 1D, but its one consistent weakness is that it sits in cash during strong
 * bull runs and lags buy-and-hold. This version keeps the defensive MR core and adds a
 * SEPARATE, slow trend-capture mode that only enters on a genuine new 200-day high in a
 * healthy uptrend and trails wide — deliberately different from the fast golden-cross
 * trend mode that failed with whipsaw. Two independent modes: MR buys deep oversold
 * flushes, trend mode rides strong breakouts.
 * When it buys and sells: MR mode buys a close below the lower Bollinger band (20,2.5)
 * with RSI<30 above a rising 200-day average, sells on the snap-back above the 20-day
 * average. Trend mode buys when price makes a new 200-day high with a rising 200-day
 * average and 50>200, and holds until a wide 3xATR trailing stop or a close below the
 * 200-day average.
 * When it does NOT work: In a broad bear the 200-day gate keeps both modes mostly flat
 * (safe but low return). If a bull market is choppy rather than trending, the new-high
 * entry fires late and the wide stop gives back profit. Low trade count means results
 * hinge on the few flushes and breakouts that actually mark real moves.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const sma50 = ctx.sma(50, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const hh200 = ctx.high(200, 1); // highest high of the last 200 closed bars
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || sma50 == null || ema20 == null || atr == null || atr <= 0 || hh200 == null) return null;

  const mode = ctx.state.mode || 'flat';
  const uptrend = sma200 > sma200prev;

  // ---- TREND MODE: ride a strong melt-up with a wide trailing stop ----
  if (mode === 'trend') {
    if (pos > 0) {
      // Trail from the running high; 3xATR is wide enough to survive 1D noise
      // (the fast golden-cross trail failed, so go wide on purpose).
      const runHigh = Math.max(ctx.state.runHigh || price, price);
      ctx.state.runHigh = runHigh;
      const stop = runHigh - 3 * atr;
      if (price < stop || price < sma200) {
        ctx.state.mode = 'flat';
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Position lost unexpectedly; drop out of trend mode.
    ctx.state.mode = 'flat';
  }

  // ---- TREND ENTRY: genuine new 200-day high in a healthy uptrend ----
  if (pos === 0) {
    // Only the strongest breakouts — this is what catches melt-ups the MR core misses.
    if (uptrend && sma50 > sma200 && price >= hh200) {
      ctx.state.mode = 'trend';
      ctx.state.runHigh = price;
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
  }

  // ---- MR MODE: defensive mean reversion (unchanged validated core) ----
  if (pos > 0) {
    if (price > ema20 || rsi > 55) {
      ctx.state.mode = 'flat';
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lowerBand = bb.lower;
  if (uptrend && price < lowerBand && rsi < 30) {
    const riskEq = 0.01 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.9;
    ctx.state.mode = 'mr';
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
