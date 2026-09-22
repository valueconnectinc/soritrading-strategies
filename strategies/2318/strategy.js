/*
 * @coinsori-strategy v1
 * name: BTC Keltner Channel Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A Keltner Channel is a volatility-based trend envelope —
 * the middle line is a slow EMA and the upper/lower bands are that EMA plus/minus
 * a multiple of the ATR (average true range). When price closes above the upper
 * band the market is trending up with real momentum; when it falls back through
 * the middle line the trend has cooled. This is a DIFFERENT trend mechanism from
 * the fixed-lookback Donchian breakout (highest/lowest close of N days): Keltner
 * adapts to current volatility, so it stays tight in calm markets and widens in
 * volatile ones. It is a clean, testable, single-asset family to A/B against the
 * confirmed Donchian flagship on the same BTC daily windows.
 * When it buys: price closes above the upper Keltner band (EMA + 2*ATR) — a
 * volatility-adjusted breakout into an uptrend, full capital.
 * When it sells: price closes back below the middle EMA line — the trend cooled.
 * When it does NOT work: in a choppy sideways market the bands get crossed back
 * and forth and it whipsaws; in a straight parabolic bull it exits on any pullback
 * to the EMA and re-enters late, so it can lag buy-and-hold. It is a trend rider,
 * not crash protection — drawdown can be deep in a bear (expect 30-45%).
 */
function onUpdate(ctx) {
  // Closed-bar reads (ago>=1) so live == backtest.
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (ema == null || atr == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0;
  const upper = ema + 2.0 * atr;

  // ---- ENTRY: close above the upper Keltner band -> volatility-adjusted breakout ----
  if (pos === 0) {
    if (px > upper) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXIT: close back below the middle EMA -> trend cooled ----
  if (px < ema) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
