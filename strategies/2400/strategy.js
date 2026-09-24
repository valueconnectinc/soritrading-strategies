/*
 * @coinsori-strategy v1
 * name: ETH Rising-200D Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The 200-day PRICE gate (enter only above the 200-day) fixed
 * the 2018 and 2021-2022 whipsaw but badly hurt 2023+ because price dips below
 * the 200-day mid-rally. This version uses the 200-day DIRECTION instead: enter
 * any time the 200-day average is rising (confirmed uptrend), regardless of where
 * price sits relative to it. The bet: a rising 200-day average marks a durable
 * uptrend where pullbacks below it are buying opportunities, not the start of a
 * bear; a falling 200-day marks the bear where dip-buys bleed.
 * When it buys and sells: Buy when price is above the 50-day average AND the
 * 200-day average is rising (sized down in high volatility / extreme fear). Sell
 * when price closes 1 ATR below the 50-day average, or drops 2.5 ATRs below it.
 * When the 200-day is falling, stay in cash.
 * When it does NOT work: It can still ride the start of a bear before the 200-day
 * rolls over, and it can miss the very first leg of a new bull before the 200-day
 * turns up. Long-only, so no profit from shorting.
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

  const uptrend = sma200 > sma200prev; // 200-day rising = durable uptrend
  const long = px > sma50 && uptrend;
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
