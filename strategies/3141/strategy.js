/*
 * @coinsori-strategy v1
 * name: BTC 4H Trend-Gated Keltner Mean-Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In a confirmed uptrend (price above the 200-period average),
 * sharp drops down to a volatility band are usually overreactions that snap back
 * to the trend mean. This recipe (20-EMA minus 2.5x ATR, RSI<40 entry, snap-back
 * exit, 200-SMA bull gate) has validated on BTC 4h across disjoint windows; this
 * build is the clean base version with no stop-loss, verified fresh here.
 * When it buys and sells: buys when the previous closed bar touched the lower
 * Keltner band while RSI was below 40 and price was above the 200-SMA; sells when
 * price snaps back up to the 20-EMA, or RSI recovers above 55, or price falls
 * below the 200-SMA (regime turned bearish). A 2-bar cooldown cuts whipsaw.
 * When it does NOT work: in sustained bear markets it stays in cash and misses
 * bear-market rallies; in a slow bleed where price grinds lower without snapping
 * back it holds a losing position until the 200-SMA regime gate turns off (this
 * is why hard stops were tested — and rejected, because they sell right before
 * the snap-back recovery).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Trend gate: only buy pullbacks while price is above the 200-SMA (bull regime).
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // Closed-bar indicators (ago=1) so the entry is identical in backtest and live.
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || rsi == null) return null;

  const lower = ema20 - 2.5 * atr; // band width: wide enough to skip noise, tight enough to catch real flushes
  const closes = ctx.closes;
  const prevClose = closes.length >= 2 ? closes[closes.length - 2] : null;
  if (prevClose == null) return null;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  ctx.watch([
    { side: 'buy', price: lower, note: 'Keltner lower band' },
    { side: 'sell', price: ema20, note: 'snap-back to EMA20' }
  ]);

  if (pos > 0) {
    // Exit: snap-back to the 20-EMA, RSI recovery, or regime turned bearish.
    if (price >= ema20 || rsi > 55 || price < sma200) {
      ctx.state.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry on a closed bar: touched the lower band while oversold, inside the bull regime.
  if (prevClose < lower && rsi < 40 && prevClose > sma200 && cd === 0) {
    ctx.state.cd = 2;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
