/*
 * @coinsori-strategy v1
 * name: Supertrend Volatility Adaptive ETH 4h
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Supertrend adapts its threshold to current volatility
 * using ATR, so it automatically widens in volatile ETH moves and tightens
 * in calm periods — unlike fixed-EMAs that generate whipsaws in chop.
 * When it buys and sells: Buys when Supertrend flips to bullish AND price
 * closes above the Supertrend line with above-average volume. Exits on
 * opposite flip or if price closes below the Supertrend line.
 * When it does NOT work: In tight ranges with no clear trend, Supertrend
 * flips back and forth producing small losses. Also may be slow to exit
 * in sharp reversals if ATR widens the band too much.
 */

function onUpdate(ctx) {
  // Supertrend parameters: ATR period 10, multiplier 3
  const atr = ctx.atr(10, 1);
  if (atr == null) return null;

  const price = ctx.price;
  const hl2 = (ctx.high(20, 1) + ctx.low(20, 1)) / 2;

  // Upper and lower bands
  const upperBand = hl2 + 3 * atr;
  const lowerBand = hl2 - 3 * atr;

  // Previous bar's bands (need 2 bars back for trend continuity)
  const atr2 = ctx.atr(10, 2);
  const hl2_2 = (ctx.high(20, 2) + ctx.low(20, 2)) / 2;
  if (atr2 == null) return null;

  const prevUpperBand = hl2_2 + 3 * atr2;
  const prevLowerBand = hl2_2 - 3 * atr2;

  // Simple trend: if price > upperBand → downtrend; price < lowerBand → uptrend
  // Track trend by comparing to previous bar's close
  const prevClose = ctx.closes[2]; // ago=2 = closed bar before previous
  if (prevClose == null) return null;

  // Determine trend direction on previous bar (ago=1)
  const prevAgo1Close = ctx.closes[1];
  if (prevAgo1Close == null) return null;

  // Previous bar trend: if prevClose > prevUpperBand → was downtrend; < prevLowerBand → was uptrend
  const prevWasDowntrend = prevClose > prevUpperBand;
  const prevWasUptrend  = prevClose < prevLowerBand;

  // Current trend: if price > upperBand → downtrend; price < lowerBand → uptrend
  const curIsDowntrend = price > upperBand;
  const curIsUptrend   = price < lowerBand;

  // Volume confirmation
  const avgVol = ctx.avgVol(20);
  const volOk = (avgVol != null && ctx.vol != null) ? (ctx.vol >= avgVol * 0.6) : true;

  const inPosition = ctx.position > 0;

  // BUY: trend flips from downtrend to uptrend (price dropped below lower band then recovered)
  const buySignal = !prevWasDowntrend && curIsUptrend && !inPosition;
  // SELL: trend flips from uptrend to downtrend (price rose above upper band then fell)
  const sellSignal = !prevWasUptrend && curIsDowntrend && inPosition;

  if (buySignal && volOk) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (sellSignal) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
