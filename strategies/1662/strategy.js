/*
 * @coinsori-strategy v1
 * name: Volume-Confirmed Trend Following
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Volume confirms whether a price move is real or noise. A break above SMA with heavy volume has better follow-through than one with thin volume.
 * When it buys and sells: Buy when price crosses above SMA50 on above-average volume (confirms break). Sell when price crosses below SMA50 or RSI hits 70.
 * When it does NOT work: In low-liquidity periods or during sudden news-driven spikes where volume is misleading; in choppy markets with repeated false breaks.
 */
function onUpdate(ctx) {
  const sma50  = ctx.sma(50);
  const sma200 = ctx.sma(200);
  const rsi    = ctx.rsi(14);
  const price  = ctx.price;
  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20); // 20-bar average volume

  if (sma50 == null || sma200 == null || rsi == null || avgVol == null) return null;

  // Trend: price above both SMAs = uptrend, below both = downtrend
  const bullMarket = price > sma50 && sma50 > sma200;
  const bearMarket = price < sma50 && sma50 < sma200;
  // Volume confirmation: today's volume must exceed the 20-bar average
  const volConfirm = vol > avgVol;

  // === ENTRY ===
  if (!ctx.position) {
    // Buy on SMA50 breakout with volume confirmation, in a bull market
    const prevClose = ctx.candle.close; // close[1] would be previous bar
    // Use closes array for previous close
    const closes = ctx.closes;
    if (closes == null || closes.length < 2) return null;
    const prevClose2 = closes[1];

    // Bull breakout: price crosses above SMA50 with volume
    if (bullMarket && price > sma50 && prevClose2 <= sma50 && volConfirm) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // === EXIT ===
  if (ctx.position > 0) {
    // Exit on trend reversal or overbought
    if (bearMarket || price < sma50) {
      return { side: 'sell', qty: ctx.position };
    }
    if (rsi > 70) {
      return { side: 'sell', qty: ctx.position };
    }
    // Trailing stop: 5% hard stop
    const stopPx = ctx.entryPx * 0.95;
    if (price < stopPx) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
