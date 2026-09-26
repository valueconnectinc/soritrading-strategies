/*
 * @coinsori-strategy v1
 * name: Donchian Pullback Vol-Sized ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A volatility-adaptive position-sizing variant of the
 * RSI-floor Donchian-pullback champion (2760). Entry and exit are IDENTICAL to
 * the champion; only the position size changes: when ATR is elevated relative
 * to price (a sharp-reversal / high-volatility regime), the position is halved.
 * Bet: risk less in regimes where pullbacks are violent and likely to keep
 * falling. The ledger shows this sizing axis reliably cuts MDD on
 * Donchian-family strategies without touching the exit — which two failed exit
 * experiments proved is optimal.
 * When it buys and sells: identical to 2760 — buy a pullback to the lower
 * 20-bar Donchian channel in a rising 200-SMA uptrend (>=0.15%/5bars) with
 * RSI(14)>30; sell at the middle Donchian channel, when the 200-SMA stops
 * rising, or on a 3xATR stop; 5-bar cooldown. Position is halved when
 * ATR(14) > 4% of price.
 * When it does NOT work: same as champion — below the 200-SMA it sits out; in
 * a fake/weak uptrend the pullback keeps going. The sizing only reduces MDD; it
 * can trim the size of winning entries in high-volatility runs.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 5);
  if (sma200 == null || sma200prev == null) return null;

  const uptrend = price > sma200 && sma200 > sma200prev;

  if (pos > 0) {
    const dcMid = (ctx.high(20, 1) + ctx.low(20, 1)) / 2;
    if (dcMid != null && price >= dcMid) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (!uptrend) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 3) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (!uptrend) return null;

  const rise = (sma200 - sma200prev) / sma200prev;
  if (rise < 0.0015) return null;

  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  if (rsi < 30) return null;

  const dcLow = ctx.low(20, 1);
  if (dcLow == null || price > dcLow * 1.01) return null;

  // VOL-ADAPTIVE SIZING: halve the position when ATR > 4% of price (elevated
  // vol regime for 4h). Entry/exit unchanged. Threshold: 4h ATR/price is ~2-3%
  // normally, so 4% catches the sharp-reversal regimes only.
  const atr = ctx.atr(14, 1);
  const sizeMult = (atr != null && atr / price > 0.04) ? 0.5 : 1;

  return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 * sizeMult };
}
