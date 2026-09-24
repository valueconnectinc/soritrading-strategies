/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis Staged-Exit 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated SOL champion loses to buy-and-hold in sustained
 * melt-ups because its all-or-nothing exit (close 1 ATR below the 50-day average) sells
 * the whole position on pullbacks that immediately recover. This variant scales out in
 * stages instead: sell half when price dips 1 ATR below the average, and the rest only if
 * the dip deepens to 2 ATR or a hard crash hits. Winners keep more of the full move.
 * When it buys and sells: Buy above the 50-day average, sized down on high volatility or
 * extreme fear. Sell half the position when price closes 1 ATR below the average; sell the
 * rest if it reaches 2 ATR below, or on a 3-ATR crash. Never re-buy until the regime is
 * back above the average.
 * When it does NOT work: In slow grind-downs that hover just under the average, the half
 * position still rides the drawdown; and partial exits mean more profit is given back in a
 * genuine top that reverses slowly. Drawdown can stay elevated in long choppy downtrends.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  const st = ctx.state;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

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
    if (long && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  // Staged exit: use a state flag so we sell half once, then the rest on deeper dip.
  if (crash) {
    st.stage = 0;
    return { side: 'sell', qty: pos };
  }
  if (dip2) {
    st.stage = 0;
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
