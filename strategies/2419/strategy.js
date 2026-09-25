/*
 * @coinsori-strategy v1
 * name: ETH Trend Donchian-10 Confirmed 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto trends persist for months, so riding price above its
 * 50-day average captures most of the upside. Adding a 10-day Donchian breakout
 * confirmation fixes the documented chop/bear-recovery weakness of the plain
 * regime-trend champion — it only buys on a fresh 10-day high, avoiding re-entry
 * into grind-downs (ledger exp 874).
 * When it buys and sells: Buy when the last closed price is above the 50-day average
 * AND at a fresh 10-day high, sized down when volatility is high or fear is extreme.
 * Sell when price closes 1 ATR below the average (ignore small chop), or drops 2.5
 * ATRs below it in a crash.
 * When it does NOT work: The 10-day breakout delays re-entry at sharp V-recoveries,
 * trimming bull gains. It is long-only, so it does not profit from shorting bears.
 * In slow grind-downs the hysteresis exit can still whipsaw and ride drawdowns.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  // Donchian breakout over the PRIOR 10 bars (k=2..11, excluding px itself) —
  // a fresh 10-day high confirms the trend is resuming, not just hovering.
  let high10 = 0;
  for (let k = 2; k <= 11; k++) {
    const c = closes[closes.length - 1 - k];
    if (c != null && c > high10) high10 = c;
  }
  const breakout = px > high10;
  const long = px > sma50 && breakout;

  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // bail out of deep crashes early

  // Volatility-scaled sizing: compare today's ATR/price to its 50-bar average.
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

  if (exitBelow || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
