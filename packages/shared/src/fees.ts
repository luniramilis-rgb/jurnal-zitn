import Decimal from 'decimal.js';

export interface FeeScheduleInput {
  stockPerShareCommission: string;
  stockMinPerFill: string;
  stockMaxPerFill: string;
  /**
   * Model persentase (IDX, ZITN-TECH-017 Fase 2). Bila > 0, komisi saham = harga × qty × pct/100
   * (per sisi beli/jual) — menggantikan komisi per-saham. `undefined`/`0` memakai per-saham.
   */
  stockPercentBuy?: string;
  stockPercentSell?: string;
  optionsPerContractCommission: string;
  optionsPerContractExchangeFee: string;
  optionsMinPerFill: string;
  optionsMaxPerFill: string;
}

export interface FillInput {
  quantity: string;
  price: string;
  type: 'stock' | 'option';
  side: 'buy' | 'sell';
}

export interface FeeResult {
  perFillFees: string[];
  totalFees: string;
}

function clampFee(raw: Decimal, min: Decimal, max: Decimal, quantity: Decimal): Decimal {
  if (quantity.isZero()) return new Decimal(0);
  if (max.isZero()) return Decimal.max(min, raw);
  return Decimal.max(min, Decimal.min(max, raw));
}

export function calculateFees(fills: FillInput[], feeSchedule: FeeScheduleInput): FeeResult {
  if (fills.length === 0) {
    return { perFillFees: [], totalFees: '0' };
  }

  const perFillFees: string[] = [];
  let total = new Decimal(0);

  for (const fill of fills) {
    const qty = new Decimal(fill.quantity);
    let fee: Decimal;

    if (fill.type === 'stock') {
      const perShare = new Decimal(feeSchedule.stockPerShareCommission);
      const min = new Decimal(feeSchedule.stockMinPerFill);
      const max = new Decimal(feeSchedule.stockMaxPerFill);
      // IDX: fee persentase per sisi bila diisi (> 0); kalau tidak, per-saham (perilaku lama).
      const pct = new Decimal(
        (fill.side === 'buy' ? feeSchedule.stockPercentBuy : feeSchedule.stockPercentSell) ?? '0',
      );
      const raw = pct.gt(0)
        ? qty.times(new Decimal(fill.price)).times(pct).div(100)
        : qty.times(perShare);
      fee = clampFee(raw, min, max, qty);
    } else {
      const perContract = new Decimal(feeSchedule.optionsPerContractCommission);
      const exchangeFee = new Decimal(feeSchedule.optionsPerContractExchangeFee);
      const min = new Decimal(feeSchedule.optionsMinPerFill);
      const max = new Decimal(feeSchedule.optionsMaxPerFill);
      const raw = qty.times(perContract.plus(exchangeFee));
      fee = clampFee(raw, min, max, qty);
    }

    const rounded = fee.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
    perFillFees.push(rounded.toString());
    total = total.plus(rounded);
  }

  return {
    perFillFees,
    totalFees: total.toString(),
  };
}
