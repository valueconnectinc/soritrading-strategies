/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive Keltner MR Basket v2 (with stops)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ATR-adaptive Keltner mean-reversion recipe is the most robust
 * cross-asset defensive edge in the ledger. v1 (no stops) validated at +117.9%/-13.5% MDD
 * (recent) and +32.0%/-13.2% (middle), but had one structural gap: a falling-knife loser
 * had no hard stop and could ride all the way down. v2 keeps the same entry recipe and adds
 * a hard stop (exit at ~2 ATR below entry) plus a take-profit at the upper Keltner band, so
 * winners are banked and losers are cut.
 * When it buys and sells: For each asset, buy when price closes below the ATR-adaptive lower
 * Keltner band (EMA20 - 2.5x ATR) with RSI below 40, but ONLY while that asset's 200-day
 * average is rising. Size each buy at 25% of total equity. Sell when price snaps back above
 * the 20-day EMA, RSI climbs above 60, price hits the upper Keltner band, OR price falls
 * ~2 ATR below the entry (hard stop-loss).
 * When it does NOT work: In a broad crypto-wide bear where ALL four assets fall together,
 * the rising-200-day gate keeps us flat (capital-preserving but captures little). It lags a
 * relentless single-asset melt-up because it only buys pullbacks. The hard stop can also
 * exit a position right before a sharp V-reversal, locking in a small loss. Defensive by
 * design — protects capital and beats buy-and-hold in chop/bear, not straight-line bulls.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Per-asset indicators (validated Keltner MR recipe, same as the single-asset champions).
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (ema20 == null || atr == null || rsi == null || sma200 == null || sma200prev == null || atr <= 0) return null;

  const pos = ctx.position;
  const lowerBand = ema20 - 2.5 * atr;
  const upperBand = ema20 + 2.5 * atr;

  if (pos > 0) {
    // Hard stop-loss: cut any position that falls ~2 ATR below its entry.
    // 2 ATR = the same distance as the entry band, so a loser is cut before it doubles down.
    const stopPx = ctx.entryPx - 2.0 * atr;
    if (Number.isFinite(stopPx) && price < stopPx) {
      return { side: 'sell', qty: pos };
    }
    // Take-profit at the upper Keltner band, or the v1 snap-back exits (EMA20 / RSI>60).
    if (price > upperBand || price > ema20 || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Only mean-revert inside a rising long-term trend — the gate that makes this family safe.
  const uptrend = sma200 > sma200prev;
  if (uptrend && price < lowerBand && rsi < 40) {
    // Size each position at 25% of total equity (4 assets -> 25% each).
    const equity = ctx.cash + ctx.uPnl;
    const targetValue = 0.25 * (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash);
    const qty = targetValue / price;
    return { side: 'buy', qty: qty };
  }
  return null;
}
