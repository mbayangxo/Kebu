import { describe, expect, it } from 'vitest';
import { orderEconomics } from '../../lib/yanmay/order-economics';
const input = { netSales: 699, ingredientCost: 157, packagingCost: 38, directLabor: 95, paymentFees: 30, creatorRoyalties: 14, otherVariableCost: 0, allocatedOverhead: 65 };
describe('order economics', () => {
  it('separates gross profit, contribution and allocated profit', () => {
    expect(orderEconomics(input)).toMatchObject({ cogs: 290, grossProfit: 409, variableCost: 334, contribution: 365, allocatedProfit: 300 });
  });
  it('handles zero revenue without a misleading margin', () => {
    expect(orderEconomics({...input, netSales: 0})).toMatchObject({ contribution: -334, contributionMargin: null });
  });
  it.each([-1, 1.5, NaN, Infinity])('rejects invalid amounts %s', (netSales) => {
    expect(() => orderEconomics({...input, netSales})).toThrow(RangeError);
  });
  it('rejects overflow', () => {
    expect(() => orderEconomics({...input, ingredientCost: Number.MAX_SAFE_INTEGER})).toThrow(RangeError);
  });
});
