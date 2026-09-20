/*
 * @coinsori-strategy v1
 * name: BTC Trend Ride FastExit SMA100 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the SMA200 trend-ride champion is strong but exits late in
 * sharp crashes (its W3 recent window is the weakest). A faster 100-SMA exit
 * should cut losses sooner in downturns while the 200-SMA entry still keeps the
 * same bull-capture timing. This tests whether faster exit speed improves the
 * recent window without hurting the bull windows.
 * When it buys and sells: long on cross above 200-SMA + 0.3x ATR (same entry as
 * champion); exit on cross below 100-SMA - 0.3x ATR (faster than champion).
 * When it does NOT work: a faster exit whipsaws more in choppy markets and can
 * exit a strong bull too early if the 100-SMA dips below price on a pullback.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const sma200P = ctx.sma(200, 2);
  const sma100 = ctx.sma(100, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma200 == null || sma200P == null || sma100 == null || closePrev == null || closePrev2 == null) return null;

  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  const band = atr != null ? 0.3 * atr : 0;

  if (pos <= 0) {
    if (closePrev2 <= sma200P + band && closePrev > sma200 + band) {
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const risk = 0.02 * cash;
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // faster 100-SMA exit
    if (closePrev < sma100 - band) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
