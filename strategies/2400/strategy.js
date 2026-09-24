/*
 * @coinsori-strategy v1
 * name: ETH Hybrid Structure-Reentry Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The structure filter (px>sma50 AND sma50>sma200) fixed the
 * 2018/2021 windows but missed 2023+ bull re-entries because it waits for the
 * 50-day to climb back above the 200-day. This hybrid keeps the defensive
 * structure filter for FRESH entries, but allows FASTER re-entries (price above
 * the 200-day) within 60 bars of an exit — so a bull pullback that stopped us out
 * can be re-entered as soon as price recovers above the 200-day, without waiting
 * for the full structure. The bet: fresh capital should only enter a confirmed
 * uptrend, but a recent exit in a bull is a pullback worth re-entering faster.
 * When it buys and sells: Fresh entry requires price above the 50-day AND the
 * 50-day above the 200-day. Re-entry within 60 bars of an exit requires only price
 * above the 50-day AND the 200-day (sized down in high volatility / extreme fear).
 * Sell when price closes 1 ATR below the 50-day, or drops 2.5 ATRs below it.
 * When it does NOT work: It can still miss the first leg of a fresh bull (waits
 * for structure) and can re-enter too early after a bear bounce (faster re-entry
 * window). Long-only.
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

  const structureLong = px > sma50 && sma50 > sma200; // fresh entry: full structure
  const fastLong = px > sma50 && px > sma200; // re-entry: just price above 200-day
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
    const recentExit = ctx.state.lastExit && (ctx.i - ctx.state.lastExit.bar) < 60;
    const allow = recentExit ? fastLong : structureLong;
    if (allow) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (exitBelow || crashStop) {
    ctx.state.lastExit = { bar: ctx.i };
    return { side: 'sell', qty: pos };
  }
  return null;
}
