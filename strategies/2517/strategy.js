/*
 * @coinsori-strategy v1
 * name: FearGreed Contrarian Volume-Confirmed
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion FearGreed contrarian buys panic-bottoms but
 * loses in quiet low-volume regimes where the lower Bollinger band is touched
 * without real capitulation. Adding a volume confirmation keeps only the dips
 * that come with genuine selling pressure — the ones that actually bounce.
 * When it buys: when sentiment is fearful (< 40), price pierces the lower
 * Bollinger band, AND volume is elevated (above its 20-bar average) — a real
 * capitulation. Sells when price recovers to the middle band or after a stop.
 * When it does NOT work: in a prolonged structural bear where fear stays extreme
 * and price keeps falling despite volume, the bounce is weak and the stop bleeds;
 * also it will skip some valid quiet-volume bottoms (fewer, higher-quality trades).
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx * 0.92) return { side: 'sell', qty: pos };
    if (price >= bb.mid) return { side: 'sell', qty: pos };
    return null;
  }

  // volume confirmation: current volume above its 20-bar average = capitulation
  // (filters quiet low-volume false dips, the regime where the champion bleeds)
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (vol == null || avgVol == null) return null;
  const volSurge = vol > avgVol;

  if (fg < 40 && price < bb.lower && volSurge) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
