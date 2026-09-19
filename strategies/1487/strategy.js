/*
 * @coinsori-strategy v1
 * name: ATR Channel Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * ATR Channel breakout: price crossing above the upper ATR channel (EMA + 2×ATR)
 * is a momentum breakout signal. Enters on channel breakouts with RSI confirming
 * directional momentum, exits when price falls back below the channel mid-line
 * or RSI turns against position.
 * Entry: Price crosses above EMA + 2×ATR band + RSI > 55 + volume above avg.
 * Sell: Price drops below EMA or RSI < 45.
 * When it fails: Choppy markets where price pierces the channel briefly and
 * retreats — whipsaws destroy gains.
 */
function onUpdate(ctx) {
  const state = ctx.state;

  if (state.lastBarI !== ctx.i) {
    state.prevPrice = state.lastPrice ?? null;
    state.lastBarI  = ctx.i;
    state.lastPrice = ctx.price;
  } else {
    state.lastPrice = ctx.price;
  }

  const price  = ctx.price;
  const ema20  = ctx.ema(20);
  const atr    = ctx.atr(14);
  const rsi   = ctx.rsi(14);

  if (ema20 == null || atr == null || rsi == null) return null;

  const prevPrice  = state.prevPrice;
  const upperBand  = ema20 + 2.0 * atr;
  const midBand    = ema20;

  const crossAbove = prevPrice != null && prevPrice <= upperBand && price > upperBand;
  const crossBelow = prevPrice != null && prevPrice >= midBand   && price < midBand;

  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const volOk  = avgVol != null && vol != null && vol > avgVol * 0.85;

  if (ctx.position === 0) {
    if (crossAbove && rsi > 55 && volOk) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  if (ctx.position > 0) {
    if (crossBelow || rsi < 45) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
