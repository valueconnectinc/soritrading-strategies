/*
 * @coinsori-strategy v1
 * name: SOL Keltner Mean Reversion 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In crypto, sharp drops to a volatility-scaled lower band (EMA20 minus 2.5 ATR)
 * with a weak RSI are usually bought back to the middle of the channel — but only inside an
 * uptrend. The SMA200 gate keeps it out of bear markets where the reversion never comes.
 * When it buys and sells: Buys when price closes below the lower band AND RSI(14) is under 40 AND
 * price is above the 200-period average. Sells when price recovers to the middle band (EMA20), or
 * on a hard stop one band-width below entry. Waits 2 bars after each exit before re-entering.
 * When it does NOT work: In a sustained crash the trend gate keeps it mostly out, and the stop caps
 * the rare entry that fails. In a flat market there are few band touches. It is long-only, so it
 * cannot profit from falling markets.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);     // closed-bar mid-band
  const atr = ctx.atr(14, 1);       // closed-bar volatility
  const rsi = ctx.rsi(14, 1);       // closed-bar RSI
  const sma200 = ctx.sma(200, 1);   // closed-bar trend gate
  const lastClose = ctx.closes.at(-2);
  const price = ctx.price;
  if (ema20 == null || atr == null || rsi == null || sma200 == null || lastClose == null || price == null) return null;

  const st = ctx.state;
  const pos = ctx.position;

  if (pos > 0) {
    const entry = ctx.entryPx || price;
    const stopPx = st.stopPx || entry - 2.5 * atr;   // one full band-width below entry = thesis broken
    ctx.watch([{ side: 'sell', price: ema20, trigger: 'above', note: 'mid-band exit' },
               { side: 'sell', price: stopPx, trigger: 'below', note: 'band stop' }]);
    // exit on mean reversion to mid-band, or the hard stop
    if (lastClose >= ema20 || price <= stopPx) {
      st.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // 2-bar cooldown after an exit — stops the churn of re-entering the same touch
  if (st.lastExit != null && ctx.i - st.lastExit < 2) return null;

  const lowerBand = ema20 - 2.5 * atr;
  // entry: close below the volatility-scaled lower band, weak RSI, and an uptrend
  if (lastClose <= lowerBand && rsi < 40 && lastClose > sma200) {
    st.entryBar = ctx.i;
    st.stopPx = price - 2.5 * atr;
    ctx.watch([{ side: 'sell', price: ema20, trigger: 'above', note: 'mid-band exit' },
               { side: 'sell', price: st.stopPx, trigger: 'below', note: 'band stop' }]);
    return { side: 'buy', qty: (ctx.cash / price) * 0.9 };
  }
  return null;
}
