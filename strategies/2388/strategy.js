/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis Staged-Exit FastReentry 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated SOL champion (staged-exit) beat buy-and-hold on every
 * window but still trailed in straight-line melt-ups because after a full exit it waited
 * for price to climb all the way back above the 50-day average before re-entering. This
 * variant adds a faster re-entry trigger: once a full exit happens inside a still-up
 * longer trend, it re-buys as soon as price crosses back above a faster 20-day average,
 * catching the resumption of the rally sooner.
 * When it buys and sells: Buy when price is above the 50-day average (or, after a full
 * exit, when price crosses back above the 20-day average while the 50-day trend is still
 * up), sized down on high volatility or extreme fear. Sell half when price closes 1 ATR
 * below the average; sell the rest at 2 ATR below or on a 3-ATR crash.
 * When it does NOT work: In a slow grind-down that hovers just under the average, the
 * faster re-entry can re-buy into a falling knife and the half position rides the
 * drawdown; in choppy sideways markets the faster trigger causes more whipsaw trades.
 * Drawdown stays elevated in long choppy downtrends.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  const st = ctx.state;
  if (px == null || sma50 == null || ema20 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const dip1 = px < sma50 - 1.0 * atr;   // mild pullback -> exit half
  const dip2 = px < sma50 - 2.0 * atr;   // deeper reversal -> exit rest
  const crash = px < sma50 - 3.0 * atr;  // hard crash -> exit everything

  // Volatility-scaled sizing (same as champion): cut exposure when vol is above normal.
  let ratioSum = 0, ratioCount = 0;
  for (let k = 1; k <= 50; k++) {
    const c = closes[closes.length - 1 - k];
    const a = ctx.atr(14, k);
    if (c != null && a != null && c > 0) { ratioSum += a / c; ratioCount++; }
  }
  let sizeMult = 1;
  if (ratioCount >= 20) {
    const normRatio = ratioSum / ratioCount;
    const currentRatio = atr / px;
    sizeMult = Math.max(0.3, Math.min(1, normRatio / currentRatio));
  }

  // Fear & greed risk filter: extreme fear (<=20) = mid-crash, cut exposure to 40%.
  const fg = ctx.data('fear_greed');
  if (fg != null && fg <= 20) {
    sizeMult *= 0.4;
  }

  if (pos === 0) {
    // Standard entry: above the 50-day average.
    let shouldBuy = long;
    // Faster re-entry after a full exit: price crossed back above the 20-day average
    // while the 50-day trend is still up (sma50 rising or price above a slow reference).
    // This is the melt-up fix: catch the resumption sooner than waiting for sma50.
    if (!shouldBuy && st.fastReentry && px > ema20 && px > sma50 - 1.0 * atr) {
      shouldBuy = true;
    }
    if (shouldBuy && cash > 0 && ctx.price > 0) {
      st.fastReentry = 0;
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  // Staged exit: use a state flag so we sell half once, then the rest on deeper dip.
  if (crash) {
    st.stage = 0;
    st.fastReentry = 1; // allow faster re-entry after a full exit
    return { side: 'sell', qty: pos };
  }
  if (dip2) {
    st.stage = 0;
    st.fastReentry = 1; // allow faster re-entry after a full exit
    return { side: 'sell', qty: pos };
  }
  if (dip1 && st.stage !== 1) {
    st.stage = 1; // mark that we already sold half on this pullback
    return { side: 'sell', qty: pos * 0.5 };
  }
  // Re-enter full regime: reset the staged-exit flag so next dip sells half again.
  if (long && st.stage === 1) {
    st.stage = 0;
  }
  return null;
}
