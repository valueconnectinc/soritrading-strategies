/*
 * @coinsori-strategy v1
 * name: Stochastic ATR Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when Stochastic %K drops below 20 (deeply oversold), then bounces
 * back above 20 — catching the exact reversal point. Uses ATR for adaptive
 * stop loss (1.5× ATR below entry) and a 5% profit target. Scales position
 * size inversely with volatility (higher ATR = smaller position).
 * When it does NOT work: in sustained one-directional trends where stochastic
 * stays oversold/overbought for days — the strategy keeps buying into a falling
 * knife, each bounce smaller than the last, until a hard stop finally fires.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Indicator warm-up ───────────────────────────────────────────────
  const stoch = ctx.stoch(14, 3, 1);   // current bar %K
  const stochp = ctx.stoch(14, 3, 2);  // previous bar %K
  const atr    = ctx.atr(14, 1);
  if (stoch == null || stochp == null || atr == null) return null;

  // ── BUY: Stochastic crosses up through 20 (oversold reversal) ────────
  if (pos === 0) {
    // Previous bar was below 20, current bar crossed back above
    const wasOversold = stochp.k < 20;
    const nowRising   = stoch.k > 20;
    if (wasOversold && nowRising) {
      // ATR stop: 1.5× ATR below entry — adapts to current volatility
      const stopPx = price - 1.5 * atr;
      ctx.log('BUY StochK=' + stoch.k.toFixed(1) + ' ATR=' + atr.toFixed(1) + ' stop=' + stopPx.toFixed(0));
      // qty in coins, risk = stop distance × qty ≤ 2% of cash
      const maxRisk  = ctx.cash * 0.02;
      const riskDist = 1.5 * atr;
      if (riskDist > 0) {
        const qty = Math.min(ctx.cash / price * 0.99, maxRisk / riskDist);
        if (qty > 0) return { side: 'buy', qty: qty };
      }
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL: profit target, overbought, or hard stop ─────────────────────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;
    const stopPx  = entryPx - 1.5 * atr;
    const hardStop = price <= stopPx;
    const profit   = pnlPct >= 0.05;   // +5% take-profit
    const overbought = stoch.k > 80;   // stochastic rich

    if (hardStop || profit || overbought) {
      ctx.log('SELL pnl=' + (pnlPct*100).toFixed(1) + '% StochK=' + stoch.k.toFixed(1));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
