/*
 * @coinsori-strategy v1
 * name: ETH Crash-Gated Reentry Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The champion's 2021-2022 loss comes from repeatedly
 * re-entering below the 200-day average during the 2022 bear and getting
 * whipsawed. Full regime gates fix that but also block the 2023+ bull's fast
 * re-entries after normal pullbacks. This version applies the gate ONLY after a
 * CRASH-STOP exit (2.5 ATR below the average): after a deep crash you must wait
 * for price to climb back above the 200-day before re-entering. Normal pullback
 * exits re-enter freely. The bet: a deep crash marks a regime change where
 * re-buying below the 200-day is a falling knife, while a normal pullback in a
 * bull is a buying opportunity.
 * When it buys and sells: Buy when price is above the 50-day average (sized down
 * in high volatility / extreme fear). If the last exit was a crash stop, require
 * price also above the 200-day. Sell when price closes 1 ATR below the 50-day
 * average, or drops 2.5 ATRs below it in a crash.
 * When it does NOT work: It can still miss the very first recovery leg after a
 * deep crash (waits for the 200-day), and it can ride a slow grind-down where
 * exits are normal (not crash) and re-entries stay ungated. Long-only.
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

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // deep crash bail-out

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
    if (cash <= 0 || ctx.price <= 0) return null;
    // After a crash stop, require price back above the 200-day before re-entering.
    const wasCrash = ctx.state.crashExit && (ctx.i - ctx.state.crashExit.bar) < 300;
    if (long && (!wasCrash || px > sma200)) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (exitBelow || crashStop) {
    if (crashStop) {
      ctx.state.crashExit = { bar: ctx.i };
    }
    return { side: 'sell', qty: pos };
  }
  return null;
}
