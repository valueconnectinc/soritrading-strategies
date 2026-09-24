/*
 * @coinsori-strategy v1
 * name: BTC ATR Channel Volatility Breakout 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: a genuinely different family from the mean-reversion that
 * dominates this job. Instead of buying dips, this rides breakouts: when price
 * closes above a volatility channel (ATR above a rolling midpoint), it buys on
 * the thesis that a breakout with expanding volatility continues. Trend-following
 * EMA whipsaw failed on 4h alts, but a volatility-adjusted breakout on BTC 1D
 * (a different market and timeframe) has not been validated.
 * When it buys and sells: buys when price closes above the upper ATR channel
 * (mid + 2.5 ATR) with volume expanding; sells when price closes back below the
 * channel midpoint or below the channel lower lip.
 * When it does NOT work: in sideways chop where every breakout immediately
 * reverses (whipsaw) — the channel gives false signals and volume confirms them.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(20);
  if (atr == null) return null;

  const sma = ctx.sma(20);
  if (sma == null) return null;

  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (vol == null || avgVol == null) return null;

  const upper = sma + 2.5 * atr;
  const lower = sma - 2.5 * atr;
  const volExpand = vol > 1.3 * avgVol;

  // BUY: close above upper channel AND volume expanding (breakout confirmed)
  if (ctx.price > upper && volExpand && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: close back below the channel midpoint (breakout failed / momentum gone)
  if (ctx.position > 0 && ctx.price < sma) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
