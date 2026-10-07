/*
 * @coinsori-strategy v1
 * name: BTC 200-Day Trend Rider ATR-Band 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The 200-day average is BTC's most robust bull/bear line.
 * The band that triggers flips is scaled to volatility: it stays a minimum of
 * 5% and widens when daily ATR is large, so choppy high-vol ranges cause fewer
 * false flips than a fixed 5% band.
 * When it buys and sells: Buys when a CLOSED bar settles above the 200-day
 * plus the band. Sells when a CLOSED bar settles below the 200-day minus the
 * band. A cooldown after each flip stops immediate re-entry.
 * When it does NOT work: In a long flat range it still flips repeatedly at
 * small loss, and in high-vol regimes the wider band gives back more before an
 * exit.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // Volatility-scaled band: at least 5%, wider when daily ATR is large (2.0x).
  const atr = ctx.atr(14, 1);
  const band = atr == null ? 0.05 : Math.max(0.05, 2.0 * atr / sma200);

  const upper = sma200 * (1 + band);
  const lower = sma200 * (1 - band);

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    if (price < lower) {
      ctx.state.cd = 10;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price > upper && cd === 0) {
    ctx.state.cd = 10;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
