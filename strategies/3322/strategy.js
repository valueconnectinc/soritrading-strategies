/*
 * @coinsori-strategy v1
 * name: BTC Fear&Greed Contrarian 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: When the Fear & Greed index drops to extreme fear (20 or below) the crowd is capitulating — a contrarian long has historically caught sharp rebounds.
 * When it buys and sells: Buys BTC when the index hits 20 or below; sells when it recovers to 50 (neutral) or above, or on a 10% stop, or after 30 days.
 * When it does NOT work: In a long grinding bear market the index can stay in extreme fear while price keeps falling — each entry hits the stop and losses add up.
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
    if (fg <= BUY_FG) {
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
