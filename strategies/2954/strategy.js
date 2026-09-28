/*
 * @coinsori-strategy v1
 * name: BTC 1D Volatility-Regime Long Overlay
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC trends up over the long run, so timing entries keeps
 * losing to buy-and-hold. Instead we stay long but switch between a small number
 * of exposure REGIMES based on 30-day realized volatility (ATR% of price). When
 * volatility is calm we are nearly fully invested; when it spikes (crashes) we
 * cut to a small defensive position. The key is we only change exposure when the
 * regime actually shifts — not every bar — so fees stay low.
 * When it buys and sells: Exposure is full when ATR% is below 4%, half when it
 * is 4-7%, and a small 20% defensive position when it exceeds 7%. It only
 * rebalances when the target regime changes, using a hysteresis band to avoid
 * churn at the boundaries. It never shorts.
 * When it does NOT work: Volatility spikes AFTER a crash starts, so it always
 * cuts exposure a step late and still eats part of the drawdown. In a long
 * grinding bear with moderate (non-spiking) vol it stays meaningfully invested
 * and bleeds. It also lags pure hold in smooth low-vol bull runs.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const atr = ctx.atr(30, 1);
  if (atr == null || atr <= 0) return null;
  const atrPct = atr / price;

  // Three discrete exposure regimes, mapped from 30-day ATR%.
  let target = 1.0;
  if (atrPct > 0.07) target = 0.2;
  else if (atrPct > 0.04) target = 0.5;

  const pos = ctx.position;
  const cash = ctx.cash;
  const targetQty = (cash / price) * target * 0.98;

  // Only act when the current position is far from the regime target (hysteresis
  // keeps us from trading every bar and bleeding fees).
  if (pos < targetQty * 0.7) {
    return { side: 'buy', qty: targetQty - pos };
  }
  if (pos > targetQty * 1.3) {
    return { side: 'sell', qty: pos - targetQty };
  }
  return null;
}
