/*
 * @coinsori-strategy v1
 * name: SOL RSI2 Panic Dip Scale-in 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: An extreme RSI(2) oversold reading with a real capitulation (price 10%+ below the 50-day high) usually marks the FIRST bar of a multi-day selloff, not the exact bottom. Buying half on the signal and the rest if the panic deepens gets a better average price on genuine capitulations, while the hard stop anchored at the first entry means the second tranche risks almost nothing.
 * When it buys and sells: Buys half when RSI(2) closes below 10, price is above the 200-day average and at least 10% below its 50-day high. If price then falls another 6% while still oversold it buys the rest with the remaining cash. Sells after 5 days, when RSI turns overbought, or on an 8% stop from the first entry. After ANY exit it waits 10 days before buying again.
 * When it does NOT work: In a grinding bear market price can keep falling after a capitulation; in a fast single-day V-recovery it may only deploy half the cash before the bounce. No data before Aug 2020.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(2, 1);       // closed bar RSI(2)
  const trend = ctx.sma(200, 1);   // closed 200-day average
  const price = ctx.price;
  if (rsi == null || trend == null || price == null) return null;

  const st = ctx.state;

  if (ctx.position <= 0) {
    // Panic dips come in clusters; re-entering every dip in a row bleeds fees.
    // Take only the first dip after a 10-day cooldown from any exit.
    if (st.cooldownUntil != null && ctx.i < st.cooldownUntil) return null;
    const high50 = ctx.high(50, 1);
    if (high50 == null) return null;
    // Capitulation depth: require price >=10% below the 50-day high so we only
    // buy genuine panics, not shallow dips in a weak market.
    if (rsi < 10 && price > trend && price <= high50 * 0.90) {
      st.entryBar = ctx.i;
      st.firstEntry = price;
      st.scaled = false;
      ctx.watch([{ side: 'sell', price: price * 0.92, trigger: 'below', note: '8% stop' },
                 { side: 'buy', price: price * 0.94, trigger: 'below', note: 'scale-in if panic deepens' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.5 };  // first tranche: half of cash
    }
    return null;
  }

  const first = st.firstEntry || ctx.entryPx || price;
  const barsHeld = ctx.i - (st.entryBar || ctx.i);
  const rsiNow = ctx.rsi(2, 0);
  const stopped = price <= first * 0.92;

  // Stop has priority: never add to a position that is already at the stop.
  if (stopped) {
    st.cooldownUntil = ctx.i + 10;  // ~2 weeks before risking capital again
    return { side: 'sell', qty: ctx.position };
  }
  // Scale-in: the first RSI2<10 bar is rarely the bottom. If price falls 6% below
  // the first entry while still deeply oversold, average down with the rest of the
  // cash — with the stop anchored at the first entry this tranche risks ~2% only.
  if (!st.scaled && price <= first * 0.94 && rsi < 10) {
    st.scaled = true;
    return { side: 'buy', qty: ctx.cash / price * 0.9 };
  }

  ctx.watch([{ side: 'sell', price: first * 0.92, trigger: 'below', note: '8% stop' }]);
  // Exit on overbought or a 5-day time limit (mean reversion decays fast)
  if (rsiNow > 70 || barsHeld >= 5) {
    st.cooldownUntil = ctx.i + 10;
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
