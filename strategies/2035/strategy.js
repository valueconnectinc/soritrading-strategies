/*
 * @coinsori-strategy v1
 * name: Donchian Momentum Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: All EMA strategies tried in this job (2030, 2033)
 * lag behind BTC's fast moves — by the time the cross fires, the move
 * is already underway. Donchian channels (highest high / lowest low over
 * N bars) are non-lagging: the breakout fires the moment price exceeds
 * the recent range, catching trends at their start. Volume confirmation
 * filters out false breakouts on thin volume.
 * When it buys and sells: Buy when price closes above the 20-bar highest
 * high AND volume exceeds 1.2× its 20-bar average. Sell when price drops
 * below the 10-bar lowest low OR 3% trailing stop triggers.
 * When it does NOT work: In volatile chop, price whipsaws above and below
 * the 20-bar high repeatedly, burning through the stop-loss repeatedly.
 * The volume filter helps but cannot eliminate all false breakouts.
 */

function onUpdate(ctx) {
  const s = ctx.state;

  // Detect new bar to update snapshots
  if (s.lastBarI !== ctx.i) {
    s.lastBarI = ctx.i;
    s.snapVol  = ctx.vol;
  }

  const vol     = ctx.vol;
  const avgVol  = ctx.avgVol(20);
  const high20  = ctx.high(20);   // highest high of last 20 bars
  const low10   = ctx.low(10);    // lowest low of last 10 bars
  const prevC   = ctx.closes[1];
  const px      = ctx.price;
  const pos     = ctx.position;

  if (vol == null || avgVol == null || high20 == null || low10 == null || prevC == null) return null;

  // Volume confirmation: breakout must have real conviction behind it
  const volConfirm = vol >= avgVol * 1.2;

  // Price breakout: previous close above 20-bar high
  const priceBreakout = prevC > high20;

  // ── Entry: Long ──────────────────────────────────────────────────────────────
  if (pos === 0) {
    if (priceBreakout && volConfirm) {
      const qty = ctx.cash / px * 0.99;
      return { side: 'buy', qty, type: 'limit', price: px, postOnly: true };
    }
    return null;
  }

  // ── Long exit ─────────────────────────────────────────────────────────────────
  if (pos > 0) {
    // Exit if price drops below 10-bar low (trend broken)
    if (prevC < low10) {
      return { side: 'sell', qty: pos };
    }
    // 3% trailing stop
    const entryPx = ctx.entryPx;
    if (entryPx != null && px < entryPx * 0.97) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  return null;
}
