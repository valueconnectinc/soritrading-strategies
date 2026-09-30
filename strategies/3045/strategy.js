/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-Mode + Melt-Up Fast Leg
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated dual-mode champion (OBV trend + Keltner MR)
 * captures melt-up upside and bear-flush recoveries, but it LAGS straight-line
 * melt-ups because its uptrend entry waits for 45-day OBV accumulation to confirm.
 * This version adds a FAST trend leg: in a confirmed uptrend it enters on a quick
 * momentum trigger (price reclaiming a short EMA) instead of waiting for OBV, so
 * it rides strong melt-ups sooner. The defensive Keltner mean-reversion leg is
 * kept unchanged for crashes.
 * When it buys and sells: Above the 200-day line it buys when price closes back
 * above its 20-day EMA (a fast trend resume) and sells when price closes back
 * below it (a fast, tight exit). Clearly below the 200-day line it buys an
 * extreme capitulation flush to the lower Keltner band with RSI<30 and sells on
 * the snap-back to the mid band.
 * When it does NOT work: Fast entries churn more in a choppy uptrend, and the
 * tight EMA20 exit gives back part of a sustained melt-up. The MR leg can still
 * catch a falling knife in a persistent crash.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || ema20 == null || atr == null || rsi == null || atr <= 0) return null;

  const uptrendMode = price > sma200;
  const bearMode = price < sma200 * 0.98;

  const st = ctx.state;

  if (pos > 0) {
    if (uptrendMode) {
      // Fast trend mode: exit when price closes back below the 20-day EMA.
      if (price < ema20) {
        st.cd = ctx.i + 2;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Bear/chop mode: sell on the snap-back to the mid band.
    if (price > ema20) {
      st.cd = ctx.i + 3;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cd != null && ctx.i < st.cd) return null;

  if (uptrendMode) {
    // Fast trend entry: price reclaims the 20-day EMA in a confirmed uptrend.
    if (price > ema20) {
      st.cd = null;
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  // Bear/chop entry: extreme capitulation flush, clearly below 200-day.
  if (bearMode && price <= ema20 - 3.0 * atr && rsi < 30) {
    st.cd = null;
    const riskEq = 0.01 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
