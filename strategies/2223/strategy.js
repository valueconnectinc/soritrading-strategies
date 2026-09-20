/*
 * @coinsori-strategy v1
 * name: ETH Daily Trend-Strength + Vol-Target Overlay 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated ETH 1d 200-SMA trend-strength ride (champion)
 * beats buy-and-hold on all clean windows but carries a 74% drawdown in the
 * 2018-21 bull because it stays fully invested through violent corrections.
 * Every binary crash-exit tried before (trailing stop, Donchian, fast re-entry)
 * destroyed more return than drawdown it saved. This version instead uses a
 * continuous VOL-TARGETING overlay: when volatility (ATR as % of price) spikes,
 * the position is scaled down; when it calms, the position is restored. The
 * trend gate (200-SMA) still decides when to be in the market at all.
 * When it buys and sells: long on a daily close crossing above the 200-SMA,
 * sell when it crosses below. While in the trend, position size is reduced in
 * high-volatility regimes and rebuilt in calm ones, capped at full size.
 * When it does NOT work: in a slow grind-up with persistently elevated vol it
 * stays undersized and misses the melt-up; in sideways chop the 200-SMA still
 * whipsaws. Vol-targeting trims winners during sharp pullbacks, so it gives up
 * some upside in exchange for a lower drawdown.
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
  const atr = ctx.atr(14, 1);
  if (atr == null || atr <= 0) return null;

  // volatility as a fraction of price — high means crash/panic regime
  const atrPct = atr / price;

  // vol threshold: ATR above ~7% of price is an elevated-volatility regime
  // (ETH daily ATR typically runs 2-5%; 7% marks a correction/panic)
  const volHi = 0.07;
  const volLo = 0.045; // calm again below this (hysteresis to avoid churn)

  if (pos <= 0) {
    // fresh close above the 200-SMA (prev below, now above) -> enter
    if (closePrev2 <= smaP && closePrev > sma) {
      // trend strength = how far price is above the SMA
      const distPct = (closePrev - sma) / sma;
      const risk = 300 + Math.min(Math.max(distPct * 20000, 0), 1200);
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  }

  // in position: exit if the daily close falls back below the 200-SMA
  if (closePrev < sma) {
    return { side: 'sell', qty: pos };
  }

  // vol-targeting overlay: trim when ATR% is high, restore when calm
  const targetFrac = atrPct > volHi ? 0.4 : (atrPct < volLo ? 1.0 : pos / (cash / price + pos));
  const targetQty = (cash / price + pos) * targetFrac * 0.98;
  if (targetQty > pos + 1e-9) {
    return { side: 'buy', qty: targetQty - pos };
  }
  if (targetQty < pos - 1e-9) {
    return { side: 'sell', qty: pos - targetQty };
  }
  return null;
}
