/*
 * @coinsori-strategy v1
 * name: Multi-Asset Mean Reversion
 * ex: binanceusdm
 * syms: BTCUSDT,ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: 이 전략은 여러 자산 간의 수익률을 비교하여 성과가 가장 좋은 자산에만 투자함으로써 리스크를 분산시키고, 평균 회귀 현상을 활용합니다. 시장이 정방향 트렌드를 보일 때는 회피하고, 변동성이 클 때는 기회를 노려 볼 수 있는 방식입니다.
 * When it buys and sells: 주기적으로 각 자산의 수익률을 비교해 가장 높은 수익률을 기록한 자산에 매수합니다. 만약 현재 포지션의 자산이 가장 높은 수익률을 기록하지 않으면 매도하여 다른 자산으로 전환합니다.
 * When it does NOT work: 강한 단방향 트렌드가 지속되는 시장에서는 효과적이지 않습니다. 또한, 모든 자산이 동시에 하락할 경우 전체 포트폴리오에 큰 손실을 입을 수 있습니다.
 */

function onUpdate(ctx) {
  // 3개의 자산에 대해 수익률 계산
  const asset1 = ctx.syms[0];
  const asset2 = ctx.syms[1];
  
  // 각 자산의 최근 24시간 수익률 계산 (5분 간격으로 최근 288개 신호)
  const returns1 = [];
  const returns2 = [];
  
  for (let i = 0; i < 288; i++) {
    const ago = i;
    const price1 = ctx.price(asset1, ago);
    const price2 = ctx.price(asset2, ago);
    
    if (price1 != null && price2 != null) {
      returns1.push((ctx.price(asset1, 0) / price1 - 1));
      returns2.push((ctx.price(asset2, 0) / price2 - 1));
    }
  }
  
  // 각 자산의 평균 수익률 계산
  const avgReturn1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
  const avgReturn2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;
  
  // 현재 포지션 및 자산 상태
  const pos1 = ctx.pos(asset1);
  const pos2 = ctx.pos(asset2);
  
  // 자산 간 비교를 위해 각 자산의 수익률 차이 계산
  const diff = avgReturn1 - avgReturn2;
  
  // 자산 선정 및 매매 판단 로직
  if (avgReturn1 > avgReturn2 && pos1 === 0 && pos2 > 0) {
    // asset1이 더 높은 수익률을 기록하고, 현재는 asset2에 포지션이 있을 경우 sell asset2 buy asset1
    return [
      { side: 'sell', qty: pos2 },
      { side: 'buy', qty: ctx.cash / ctx.price(asset1) * 0.99 }
    ];
    
  } else if (avgReturn2 > avgReturn1 && pos2 === 0 && pos1 > 0) {
    // asset2가 더 높은 수익률을 기록하고, 현재는 asset1에 포지션이 있을 경우 sell asset1 buy asset2
    return [
      { side: 'sell', qty: pos1 },
      { side: 'buy', qty: ctx.cash / ctx.price(asset2) * 0.99 }
    ];
    
  } else if (diff > 0.001 && pos1 === 0 || diff < -0.001 && pos2 === 0) {
    // 둘 다 포지션 없다면, 더 높은 수익률을 기록한 자산에 매수
    if (avgReturn1 > avgReturn2) {
      return { side: 'buy', qty: ctx.cash / ctx.price(asset1) * 0.99 };
    } else {
      return { side: 'buy', qty: ctx.cash / ctx.price(asset2) * 0.99 };
    }
    
  } else if (diff <= 0.001 && pos1 > 0 || diff >= -0.001 && pos2 > 0) {
    // 수익률 차이가 미미하거나 음수일 경우 기존 포지션 유지 또는 매도
    return null;
  }
  
  return null;
}
