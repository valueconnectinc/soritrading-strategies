/*
 * @coinsori-strategy v1
 * name: ETH Daily Equity-Scaled Trend Ride 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the daily 200-SMA trend ride cuts drawdown hard (31% vs
 * buy-and-hold's 75% on the recent window) but lags holding on raw return
 * because a fixed $ risk never grows with the account. Scaling the risk base
 * to a percentage of current cash makes a bull that compounds the account buy
 * more coins on each re-entry so it catches more of the up-move while still
 * cutting the downside. SMA 200 (not a faster one) is used because its slow
 * discipline avoids whipsaw in sideways markets, which a faster SMA suffers.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position size = risk/ATR, risk = 3% of cash + trend-strength
 * bonus, capped at 30% of cash.
 * When it does NOT work: in a long sideways market price pokes above and below
 * the trend line (repeated small losses), and it lags the exact top/bottom of
 * parabolic bulls, giving back some at each turn.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const distPct = (closePrev - sma) / sma;
      // 3% of cash base + trend bonus, capped at 30% of cash
      const baseRisk = 0.03 * cash + Math.min(Math.max(distPct * 20000, 0), 2000);
      const risk = Math.min(baseRisk, 0.30 * cash);
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
