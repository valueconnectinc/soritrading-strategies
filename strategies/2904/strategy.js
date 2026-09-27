/*
 * @coinsori-strategy v1
 * name: Vol-Targeted Long-Only BTC/ETH/SOL 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A pure position-sizing overlay. Instead of trying to time the
 * market (which every trend family here lags in straight-line bulls), it stays LONG
 * the whole time but sizes each position by inverse volatility — a constant-volatility
 * target. When volatility is low it holds a large position (riding melt-ups); when
 * volatility spikes it cuts size (protecting drawdown). This directly fixes the
 * trend-lag weakness of the signal-based champions: it is never out of the market
 * during a bull run.
 * When it buys and sells: it rebalances daily to a target portfolio volatility
 * (e.g. 40% annualized). Position size = targetVol / realizedVol, capped at 100% of
 * equity. It buys more when vol is low, sells down when vol is high.
 * When it does NOT work: in a long grinding bear market it stays long and bleeds;
 * vol-targeting reduces but does not eliminate directional loss. It also underperforms
 * a simple buy-and-hold when volatility is persistently high (it holds a smaller
 * position than it could). No signal — it never goes to cash on its own.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Realized volatility from ATR as a fraction of price (daily vol proxy).
  const atr = ctx.atr(14, 1);
  if (atr == null || atr <= 0) return null;
  const dailyVol = atr / price;

  // Annualize: daily vol * sqrt(252). Target 40% annualized portfolio vol.
  const TARGET_ANN_VOL = 0.40; // 40% — high enough to capture bulls, low enough to cap MDD
  const dailyTarget = TARGET_ANN_VOL / Math.sqrt(252);

  // Position fraction = target vol / realized vol, clamped to [0, 1].
  let frac = dailyTarget / dailyVol;
  if (frac > 1) frac = 1;
  if (frac < 0.05) frac = 0.05; // never fully exit — stay in the market

  const pos = ctx.position;
  const targetQty = ctx.cash / price * frac;
  const curVal = pos * price;

  // Rebalance only when the position drifts meaningfully from target (avoid fee churn).
  const drift = Math.abs(curVal - targetQty * price) / (targetQty * price || 1);
  if (drift < 0.15) return null; // 15% band — rebalance rarely, keep fees low

  if (targetQty > curVal) {
    return { side: 'buy', qty: targetQty - pos };
  }
  return { side: 'sell', qty: pos - targetQty };
}
