/*
 * @coinsori-strategy v1
 * name: ETH Vol-Scaled Trend + ATR Trailing 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: combines two edges that each held up on their own. (1) Volatility
 *   scaling sizes each position by ATR so dollar risk per trade stays constant, which
 *   made money in every ETH 4h window and beat buy-and-hold in the recent bear. (2) An
 *   ATR-adaptive trailing stop locks profits during a trend and generalized across SOL
 *   and ETH where a fixed percentage stop failed. Together they keep the upside of the
 *   trend while cutting the deep drawdowns of a plain trend-follow.
 * When it buys and sells: Buy when the 50-period EMA is above the 200-period EMA
 *   (uptrend), sized so the expected move (ATR) is ~2% of the account. Sell when price
 *   closes below 8 ATR off the highest close since entry, or when the uptrend breaks
 *   (fast EMA crosses below slow).
 * When it does NOT work: In choppy sideways markets the EMA whipsaws in and out and the
 *   trailing stop can be hit on noise. In a violent crash the trend exit still lags and
 *   takes a hit. Long-only, so it misses short-side gains in bears.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(50, 1);
  const slow = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  if (fast == null || slow == null || atr == null || atr <= 0) return null;

  const s = ctx.state;
  const px = ctx.closes[ctx.closes.length - 1];
  const pos = ctx.position;

  // Track the highest close since entry to trail the stop from.
  if (pos > 0) {
    if (s.entryBar !== ctx.i) {
      if (s.highSince === undefined || px > s.highSince) s.highSince = px;
      s.entryBar = ctx.i;
    }

    // Exit 1: ATR-adaptive trailing stop (8 ATR below the running high) — wide enough
    // to avoid noise churn with vol-scaled sizing.
    const TRAIL_ATR = 8;
    if (s.highSince !== undefined && px < s.highSince - TRAIL_ATR * atr) {
      s.highSince = undefined;
      return { side: 'sell', qty: pos };
    }
    // Exit 2: trend broken.
    if (fast < slow) {
      s.highSince = undefined;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter: uptrend, size by volatility so risk per trade is constant.
  if (fast > slow) {
    const RISK_FRAC = 0.02; // risk ~2% of account per trade
    const riskPerUnit = atr / ctx.price; // fractional move per ATR
    const qty = (ctx.cash * RISK_FRAC) / (ctx.price * riskPerUnit);
    s.highSince = px;
    s.entryBar = ctx.i;
    return { side: 'buy', qty: Math.min(qty, (ctx.cash / ctx.price) * 0.98) };
  }

  return null;
}
