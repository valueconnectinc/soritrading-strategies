/*
 * @coinsori-strategy v1
 * name: btc_onchain_meanrev_1d
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC pullbacks inside a healthy network-growth regime tend to bounce.
 * I use on-chain data (hashrate expanding = miners committed) as a fundamental regime
 * filter, and only fade oversold dips when the network is still growing. Once in a trade I
 * let winners run with a trailing stop so a strong uptrend isn't given back early.
 * When it buys and sells: buys when RSI is oversold while hashrate is above its 30-day
 * average and price is above the 200-day average; sells when the trailing stop is hit or
 * RSI gets extremely overbought (a blow-off top).
 * When it does NOT work: if hashrate falls (miner capitulation) or price breaks below the
 * 200-day average, the dip is not a bounce but a regime change — this loses in genuine
 * bear markets and during mining crackdowns.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const rsi = ctx.rsi(14, 1);
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (rsi == null || sma50 == null || sma200 == null || atr == null) return null;

  // On-chain regime filter (user's connected DB datasets). null = data unknown, sit out.
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  if (hr == null || hrSma == null) return null;
  const networkGrowing = hr > hrSma;

  if (ctx.position > 0) {
    // Track the highest close since entry for the trailing stop.
    const hi = ctx.state.trailHigh == null ? px : Math.max(ctx.state.trailHigh, px);
    ctx.state.trailHigh = hi;

    // Trailing stop: 3x ATR below the peak. Lets winners run in melt-ups,
    // still locks in profit when the trend turns.
    const stop = hi - 3 * atr;
    if (px < stop) {
      ctx.state.trailHigh = null;
      return { side: 'sell', qty: ctx.position };
    }
    // Blow-off exit: RSI > 75 means euphoria, take profit before the reversal.
    if (rsi > 75) {
      ctx.state.trailHigh = null;
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // Long-term uptrend required — avoid catching knives in bear markets.
  if (px <= sma200) return null;
  // Network must still be expanding.
  if (!networkGrowing) return null;

  // Buy deep oversold panic: RSI < 30 and price below the 50-day mean.
  if (rsi < 30 && px < sma50) {
    ctx.state.trailHigh = px;
    return { side: 'buy', qty: ctx.cash / px * 0.99 };
  }
  return null;
}
