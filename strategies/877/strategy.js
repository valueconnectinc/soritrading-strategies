/*
 * @coinsori-strategy v1
 * name: Volatility Breakout Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses volatility-based breakouts to enter trades.
 * It calculates the Average True Range (ATR) over 14 periods and then looks for price breakouts above or below 
 * a certain multiple of ATR from the recent high/low.
 * 
 * When price breaks above (high + ATR * multiplier), it's considered a bullish breakout — a buy signal.
 * When price breaks below (low - ATR * multiplier), it's considered a bearish breakout — a sell signal.
 *
 * The strategy focuses on capturing strong moves during volatile market conditions and ignores quiet periods.
 * The idea is to catch breakout opportunities when volatility suddenly increases.
 * 
 * This approach works best in trending markets with clear breakouts and high volatility.
 * It does not work well in ranging markets or low-volatility conditions where there are few breakout opportunities.
 */

function onUpdate(ctx) {
  // Get ATR (Average True Range)
  const atr = ctx.atr(14, 0);           // Current ATR
  const atrPrev = ctx.atr(14, 1);       // Previous ATR
  
  // Get recent high/low for breakout calculation
  const high = ctx.high(20, 0);         // Current high over past 20 periods  
  const low = ctx.low(20, 0);           // Current low over past 20 periods
  
  // Get previous high/low
  const highPrev = ctx.high(20, 1);     // Previous high
  const lowPrev = ctx.low(20, 1);       // Previous low
  
  // Guard against null values (warm-up period)
  if (!atr || !atrPrev || !high || !low || !highPrev || !lowPrev) return null;
  
  // Breakout thresholds (using 1.5x ATR multiplier)
  const breakoutUp = highPrev + atrPrev * 1.5;
  const breakoutDown = lowPrev - atrPrev * 1.5;
  
  // Buy condition: Price breaks above breakout level
  if (ctx.price > breakoutUp && ctx.position <= 0) {
    return { 
      side: 'buy', 
      qty: ctx.cash / ctx.price * 0.99 
    };
  }
  
  // Sell condition: Price breaks below breakout level
  if (ctx.price < breakoutDown && ctx.position > 0) {
    return { 
      side: 'sell', 
      qty: ctx.position 
    };
  }

  // No action needed
  return null;
}
