/*
 * @coinsori-strategy v1
 * name: ETH Regime-Gated Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The champion regime-trend recipe's worst window is 2021-2022
 * (-25% vs market +65%) where it keeps buying dips in the 2022 bear market and
 * gets whipsawed. This version adds a long-term regime gate: it only opens a long
 * while price is above the 200-day average, so it stops chasing falling knives in
 * a confirmed bear. The bet: in crypto, once price is below its 200-day average
 * the downtrend tends to persist, and staying in cash through it beats repeated
 * dip-buys.
 * When it buys and sells: Buy when price is above BOTH the 50-day and the 200-day
 * average (sized down in high volatility / extreme fear). Sell when price closes
 * 1 ATR below the 50-day average, or drops 2.5 ATRs below it in a crash. When
 * price is below the 200-day average, stay in cash.
 * When it does NOT work: The 200-day gate can make it miss the early recovery leg
 * of a new bull (price must first climb back above the 200-day before it buys),
 * so it can lag the bottom of a bear-to-bull turn. It is long-only, so it does not
 * profit from shorting bear markets.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 220) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma200 == null || atr == null || px <= 0) return null;

  const long = px > sma50 && px > sma200; // regime gate: only enter above 200-day
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
