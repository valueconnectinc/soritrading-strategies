/*
 * @coinsori-strategy v1
 * name: BTC Mean Reversion RSI-BB
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: in ranging markets BTC repeatedly snaps back to its mean
 * after short oversold dips, so buying a dip that is both oversold on RSI and
 * below the lower Bollinger band, then selling on the bounce, captures that pull.
 * When it buys and sells: buys when RSI(14) crosses below 30 while the close is
 * under the lower Bollinger band (20,2); sells when RSI climbs back above 45,
 * or price hits a fixed take-profit (3%) or a hard stop-loss (2.5%).
 * When it does NOT work: in strong one-way trends the price keeps falling after
 * the oversold dip ("falling knife") and the hard stop locks in losses; it also
 * bleeds in flat, low-volatility chop where the bounce never reaches the target.
 */
function onUpdate(ctx) {
  // Use only closed bars so signals are identical live and in backtest.
  const rsi = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 2);
  const bb = ctx.bb(20, 2, 1);
  if (rsi == null || rsiPrev == null || bb == null) return null;

  if (ctx.position <= 0) {
    // Entry: RSI just crossed down through 30 AND close below the lower band.
    const crossedDown = rsiPrev > 30 && rsi <= 30;
    const belowBand = ctx.closes.at(-2) <= bb.lower;
    if (crossedDown && belowBand) {
      // Size at half cash so a string of stops cannot ruin the account.
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.5 };
    }
    ctx.watch([{
      side: 'buy', price: bb.lower, trigger: 'below', note: 'BB lower + RSI<30',
      conds: [{ label: 'RSI(14) closed', now: rsi, op: '<', ref: 30, closed: true }]
    }]);
    return null;
  }

  // Manage the open position.
  const tp = ctx.entryPx * 1.03;   // take profit: mean reversion target ~3%
  const stop = ctx.entryPx * 0.975; // hard stop: cap loss at 2.5%, never hold a loser
  if (rsi > 45 || ctx.price >= tp || ctx.price <= stop) {
    return { side: 'sell', qty: ctx.position };
  }
  ctx.watch([
    { side: 'sell', price: tp, trigger: 'above', note: 'take profit 3%' },
    { side: 'sell', price: stop, trigger: 'below', note: 'hard stop 2.5%' },
    { side: 'sell', price: 0, trigger: 'above', note: 'RSI>45 exit',
      conds: [{ label: 'RSI(14) closed', now: rsi, op: '>', ref: 45, closed: true }] }
  ]);
  return null;
}
