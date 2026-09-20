/*
 * @coinsori-strategy v1
 * name: DOGE BB-RSI Mean Reversion + Fixed Gate + ATR Stop 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BB+RSI mean-reversion dip-buy validated well on DOGE
 * (2/3 windows beat market, strong recent-bear defense). The prior crash-guard
 * used a tight fixed SMA gate (price > sma100*0.97) which was excellent at
 * avoiding knives in the recent bear but gave up a lot of bull upside. An
 * earlier ATR-adaptive gate recovered the bull upside but loosened crash
 * defense too far (recent bear went negative). This version keeps the tight
 * fixed gate for crash defense AND makes only the stop-loss ATR-adaptive, so
 * stops are not blown out by normal noise in high-vol regimes.
 * When it buys and sells: buy when price touches the lower Bollinger band AND
 * RSI is oversold AND price is still near/above the long-term SMA (a dip, not
 * a collapse). Sell back at the middle band or when RSI turns overbought; stop
 * out on an ATR-scaled drop below entry.
 * When it does NOT work: in a strong sustained bull the lower band is rarely
 * touched so it sits in cash and misses the melt-up; the tight gate also skips
 * the first leg of a genuine bottom (dips below the long mean).
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma100 = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma100 == null || atr == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // tight fixed crash gate: only buy a dip inside an intact range, not a collapse
    if (price < bb.lower && rsi < 35 && price > sma100 * 0.97) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // Exit at the mean / overbought, or ATR-scaled stop (2.5*ATR below entry).
    if (price > bb.mid || rsi > 65 || price < ctx.entryPx - 2.5 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
