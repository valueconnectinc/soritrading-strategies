/*
 * @coinsori-strategy v1
 * name: BTC Fear&Greed Contrarian 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: When the Fear & Greed index drops to extreme fear inside an uptrend, the crowd is capitulating on a dip — contrarian longs catch sharp rebounds.
 * When it buys and sells: Buys BTC when the index is 20 or below AND price is above its 200-bar (33-day) average; sells when the index recovers to 50 or above, or on a 10% stop, or after 30 days.
 * When it does NOT work: In a long grinding bear market price stays below the 200-bar average so it mostly sits out; if it triggers during a late-stage breakdown it still loses to the stop.
 */

function onUpdate(ctx) {
  const fg = ctx.data('fg');
  const price = ctx.price;
  if (fg == null || price == null) return null;

  const st = ctx.state;
  const BUY_FG = 20;     // 0-100 index; <=20 is "extreme fear" = capitulation
  const SELL_FG = 50;    // exit once fear is gone (back to neutral)
  const STOP = 0.10;     // 10% hard stop: extreme fear can keep deepening
  const TIME_STOP = 180; // 30 days on 4h: give up if no recovery

  if (ctx.position <= 0) {
    const sma = ctx.sma(200, 1);          // trend filter: only fade dips inside an uptrend
    const prevClose = ctx.closes.at(-2);  // last CLOSED bar (same in live and backtest)
    if (sma == null || prevClose == null) return null;
    if (fg <= BUY_FG && prevClose > sma) {
      st.sinceEntry = 0;
      ctx.watch([{ side: 'sell', price: price * (1 - STOP), trigger: 'below', note: '10% stop' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.8 };
    }
    return null;
  }

  const entry = ctx.entryPx || price;
  st.sinceEntry = (st.sinceEntry || 0) + 1;

  ctx.watch([{ side: 'sell', price: entry * (1 - STOP), trigger: 'below', note: '10% stop' }]);

  if (fg >= SELL_FG || price <= entry * (1 - STOP) || st.sinceEntry >= TIME_STOP) {
    st.sinceEntry = 0;
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
