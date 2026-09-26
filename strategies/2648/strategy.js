/*
 * @coinsori-strategy v1
 * name: Stoch-Oversold Mean Reversion ADA 4H
 * ex: binance
 * syms: ADAUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A genuinely different mean-reversion trigger. Instead of
 * the champion's RSI+Bollinger lower-band touch, this uses the stochastic
 * oscillator's oversold zone (a different momentum-mean-reversion signal) to
 * catch the same panic-bottom snap-back. Tests whether the entry trigger is
 * the source of the edge or whether any oversold signal works.
 * When it buys and sells: buys when stochastic %K crosses back up out of the
 * oversold zone (<20) while price is above the 200-SMA; sells at the middle
 * Bollinger band / RSI>50 / 6-ATR stop; waits 5 bars before re-entering.
 * When it does NOT work: stochastic whipsaws more than RSI in choppy sideways
 * markets, so it may overtrade; still lags melt-ups and never buys below the
 * 200-SMA like the whole defensive family.
 */
function onUpdate(ctx) {
  const st = ctx.stoch(14, 3, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (st == null || bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  if (price < sma200) return null;

  // Stoch oversold crossover: %K crossed back above 20 from below = bounce signal.
  const stPrev = ctx.stoch(14, 3, 2);
  if (stPrev == null) return null;
  if (stPrev.k <= 20 && st.k > 20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
