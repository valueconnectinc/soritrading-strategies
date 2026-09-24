/*
 * @coinsori-strategy v1
 * name: ETH Confirmed-Bear Gate Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The pure price gate (enter only above the 200-day) fixed the
 * 2018/2021 whipsaw but hurt 2023+ because price dips below the 200-day mid-rally.
 * This version blocks entry ONLY in a confirmed bear: price below the 200-day AND
 * the 200-day itself falling. In a bull (200-day rising) it allows entry even if
 * price is temporarily below the 200-day, so it keeps the recovery legs. The bet:
 * a rising 200-day marks a durable uptrend where below-average dips are buyable; a
 * falling 200-day with price below it marks the bear to avoid.
 * When it buys and sells: Buy when price is above the 50-day average AND NOT
 * (price below the 200-day AND the 200-day falling) — i.e. blocked only in a
 * confirmed bear (sized down in high volatility / extreme fear). Sell when price
 * closes 1 ATR below the 50-day average, or drops 2.5 ATRs below it in a crash.
 * When it does NOT work: It can still ride the start of a bear before the 200-day
 * turns down, and it can lag a fresh bull's first leg. Long-only.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 220) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma200 == null || sma200prev == null || atr == null || px <= 0) return null;

  // Confirmed bear: price below the 200-day AND the 200-day is falling.
  const confirmedBear = px < sma200 && sma200 < sma200prev;
  const long = px > sma50 && !confirmedBear;
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
