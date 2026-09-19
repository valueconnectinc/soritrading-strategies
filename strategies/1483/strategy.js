/*
 * @coinsori-strategy v1
 * name: RSI BB Mean Reversion v4 (Tighter Entry)
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Tighter entry: RSI < 30 (more extreme oversold) + price below lower BB
 * (not just at it). This waits for a more extreme setup, fewer but higher-
 * quality signals. Exit on RSI > 70 or upper BB.
 * When it fails: Even more selective means fewer trades — if the market
 * doesn't reach RSI<30 with price below the band, the strategy sits out.
 */
function onUpdate(ctx) {
  const rsi  = ctx.rsi(14);
  const bb   = ctx.bb(20, 2);
  if (rsi == null || bb == null) return null;

  const price  = ctx.price;
  const lower   = bb.lower;
  const upper   = bb.upper;
  const vol     = ctx.vol;
  const avgVol  = ctx.avgVol(20);
  const volOk   = avgVol != null && vol != null && vol > avgVol * 0.8;

  // Entry: more extreme — RSI < 30 AND price BELOW lower band
  if (ctx.position === 0) {
    if (rsi < 30 && price < lower && volOk) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // Exit: RSI overbought OR price at upper band
  if (ctx.position > 0) {
    if (rsi > 70 || price >= upper) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
