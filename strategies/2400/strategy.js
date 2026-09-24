/*
 * @coinsori-strategy v1
 * name: ETH Wide-Hysteresis Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The champion's 2021-2022 weakness (-25% vs market +65%)
 * comes from whipsawing out of the volatile bull on shallow pullbacks (1 ATR
 * below the average). This version widens the exit hysteresis to 1.5 ATR so it
 * tolerates deeper pullbacks before selling. The bet: in a high-volatility bull,
 * pullbacks routinely exceed 1 ATR without ending the trend, so a wider exit
 * keeps the position through more of the rally. No regime gate is used, because
 * gates block the aggressive re-entry the 2023+ bull rewards.
 * When it buys and sells: Buy when price is above the 50-day average (sized down
 * in high volatility / extreme fear). Sell when price closes 1.5 ATRs below the
 * 50-day average, or drops 3 ATRs below it in a crash.
 * When it does NOT work: A wider exit gives back more profit before selling in a
 * topping range, and it can ride deeper drawdowns before the exit triggers
 * (MDD can be large). It is long-only, so it does not profit from shorting.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.5 * atr; // wider hysteresis: tolerate deeper pullbacks
  const crashStop = px < sma50 - 3.0 * atr; // deep crash bail-out

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
