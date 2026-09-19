/*
 * @coinsori-strategy v1
 * name: ATR Volatility Expansion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL tends to make explosive moves after low-volatility consolidation.
 * ATR expansion signals the start of directional moves — entering early captures the burst.
 * When it buys and sells: Buy when price breaks above EMA20 by more than 1× ATR with RSI>50
 * confirming upward momentum and volume confirming the move. Sell when RSI falls below 40
 * (momentum exhaustion) or price drops below EMA20 minus 0.5× ATR (volatility collapse).
 * When it does NOT work: In choppy low-volume markets where ATR spikes are false breakouts,
 * and in prolonged bear trends where RSI stays suppressed despite ATR expansion.
 */
function onUpdate(ctx) {
  // Indicators
  const ema20  = ctx.ema(20);
  const ema50  = ctx.ema(50);
  const atr    = ctx.atr(14);
  const rsi    = ctx.rsi(14);
  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20);

  // Guard: need all data
  if (ema20 == null || ema50 == null || atr == null || rsi == null || avgVol == null) return null;

  // ATR expansion threshold: current ATR must exceed its 20-bar EMA of ATR (volatility rising)
  // We approximate this by checking if ATR > ATR 1 bar ago (growing ATR)
  const atrPrev = ctx.atr(14, 1);
  if (atrPrev == null) return null;

  // Price relative to ATR bands
  const upperBand = ema20 + atr;        // breakout upper band
  const lowerBand = ema20 - 0.5 * atr;  // trailing stop / exit band

  // Volume confirmation: current volume > 1.2× average volume
  const volumeConfirm = vol > avgVol * 1.2;

  // Entry: price breaks above upper band with RSI confirming, volume confirming, ATR expanding
  // Long only when price is already above EMA50 (broader uptrend confirmation)
  const priceBreakout = ctx.price > upperBand;
  const rsiConfirm    = rsi > 50 && rsi < 80;  // not overbought
  const atrExpanding  = atr > atrPrev;           // volatility increasing
  const trendUp       = ema20 > ema50;          // medium-term uptrend

  if (ctx.position === 0 && priceBreakout && rsiConfirm && atrExpanding && trendUp && volumeConfirm) {
    // Market buy with 99% of available cash
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Exit: RSI exhausted (< 40) OR price falls below lower band
  if (ctx.position > 0) {
    const rsiExit = rsi < 40;
    const priceExit = ctx.price < lowerBand;

    if (rsiExit || priceExit) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
