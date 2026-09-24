/*
 * @coinsori-strategy v1
 * name: ETH Trend Profit-Lock Trailing 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated trend champion captures bulls well (+144%/+69% in
 * the two bull windows) but its biggest weakness is riding full drawdowns (MDD 61-67%)
 * because it only exits when price drops 1 ATR below the 50-day average. This variant
 * keeps the champion's proven entry (buy above the 50-day average) but adds a TRAILING
 * profit-lock: once the position is meaningfully profitable, it exits if price falls
 * 3 ATR from the highest high since entry. This locks in gains during grind-downs that
 * never make a new high, without exiting early in normal pullbacks of a healthy bull.
 * When it buys and sells: Buy when price closes above the 50-day average, sized down
 * when volatility is high or fear is extreme. Sell when price closes 1 ATR below the
 * average, OR drops 2.5 ATRs below it in a crash, OR (once up >2 ATR from entry) falls
 * 3 ATR from the highest high since entry.
 * When it does NOT work: In straight-line melt-ups the trailing stop can exit on a deep
 * pullback that immediately recovers, giving back some of the run; and it is long-only,
 * so it does not profit from shorting bear markets.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  const entryPx = ctx.entryPx || 0;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
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

  // Trailing profit-lock: track highest high since entry; once up >2 ATR, exit if
  // price falls 3 ATR from that high. This protects gains in grind-downs.
  const st = ctx.state || {};
  const runHigh = Math.max(st.hi || entryPx, ctx.high(1) || entryPx);
  const profit = entryPx > 0 ? (px - entryPx) / atr : 0;
  const trailed = profit > 2.0 && (runHigh - px) > 3.0 * atr; // lock profit after a real run

  if (exitBelow || crashStop || trailed) {
    return { side: 'sell', qty: pos };
  }
  ctx.state = { hi: runHigh };
  return null;
}
