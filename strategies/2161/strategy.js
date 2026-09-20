/*
 * @coinsori-strategy v1
 * name: ETH Trend Equity-Scaled Risk 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the validated ETH 200-SMA trend ride (long above the SMA,
 * sell below it) protects downside well but lags buy-and-hold in mega-bulls.
 * The cause: risk is a fixed $300 base, so as the account compounds upward in a
 * bull the strategy still risks only $300 — it never scales position size with
 * the wealth it has earned. This version makes the risk base a percentage of
 * current cash (2%), so a bull that grows the account naturally risks more and
 * buys more coins. The trend-strength bonus (distance above the SMA) is kept
 * from the proven version, and total risk is capped at 25% of cash so a single
 * whipsaw can never destroy the account.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position size = risk / ATR.
 * When it does NOT work: sizing up with equity also sizes up losses in a bear
 * that the SMA filter lets through late, and compounding into a false breakout
 * after a long run loses more than the flat-size version.
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
      // trend strength = how far price is above the 200-SMA, in fraction
      const distPct = (closePrev - sma) / sma;
      // risk base = 2% of cash (grows with compounding) + distance bonus
      const baseRisk = 0.02 * cash + Math.min(Math.max(distPct * 20000, 0), 1200);
      // never risk more than 25% of cash in one trade
      const risk = Math.min(baseRisk, 0.25 * cash);
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
