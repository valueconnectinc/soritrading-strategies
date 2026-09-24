/*
 * @coinsori-strategy v1
 * name: XLM Keltner Mean Reversion 4H
 * ex: binance
 * syms: XLMUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Mature low-volatility altcoins tend to mean-revert after sharp
 * oversold dips rather than crash through them. XLM is in the same low-vol family
 * (LTC/XRP/DOT) where band-bounce mean reversion produced repeatable wins.
 * When it buys and sells: buys when price dips below the lower Keltner band with a
 * weak RSI and the market is still in a long-term uptrend (above the 200-SMA); sells
 * when price climbs back to the middle band or the uptrend breaks.
 * When it does NOT work: in prolonged bear markets below the 200-SMA (it stays in cash,
 * missing nothing but also not shorting), and on high-volatility meme coins where
 * oversold bounces are too noisy. It also misses the biggest bull-run gains because
 * it only enters on dips.
 */
function onUpdate(ctx) {
  // ---- regime gate: only take longs when the long-term trend is up ----
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const price = ctx.price;
  const inUptrend = price > sma200;

  // ---- Keltner channel on closed bars (ago>=1 = identical in backtest/live) ----
  const mid = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  if (mid == null || atr == null || rsi == null) return null;

  const k = 2.0; // 2 ATR band width — standard Keltner, wide enough to avoid noise
  const lower = mid - k * atr;

  // ---- entry: oversold touch of lower band, RSI weak, uptrend intact ----
  const prevClose = ctx.closes[ctx.closes.length - 2];
  const prevLower = ctx.ema(20, 2) - k * ctx.atr(14, 2); // lower band one bar ago
  const touchLower = prevClose <= prevLower;

  if (ctx.position === 0) {
    if (inUptrend && touchLower && rsi < 45) {
      // RSI<45 confirms the dip is oversold, not just a mild pullback
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- exit: mean reversion back to the middle band, or trend break, or stop ----
  if (price >= mid || !inUptrend) {
    return { side: 'sell', qty: ctx.position };
  }
  // hard stop: 8% below entry to cap a single dip that keeps falling
  if (price <= ctx.entryPx * 0.92) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
