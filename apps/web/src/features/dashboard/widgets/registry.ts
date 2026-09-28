import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { z, type ZodTypeAny } from 'zod';

import type { MessageKey } from '@jurnal-zitn/shared';
import { WidgetDefaultSize } from '@jurnal-zitn/shared/constants/dashboard-defaults';
import { PerWidgetMinSize, type WidgetType } from '@jurnal-zitn/shared/schemas/dashboard';

export interface WidgetDefinition {
  type: WidgetType;
  displayName: string;
  /** Kunci kamus untuk judul yang tampil (A2); `displayName` tetap untuk uji/stabil. */
  displayNameKey: MessageKey;
  // `any` props: individual widgets declare their own prop shapes (e.g.
  // PerformanceChartWidget takes `{ placement, onUpdateConfig }`). The route
  // (Task 43) is responsible for passing the right props per widget type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: LazyExoticComponent<ComponentType<any>>;
  minSize: { w: number; h: number };
  defaultSize: { w: number; h: number };
  defaultConfig?: unknown;
  configSchema?: ZodTypeAny;
}

export const widgetRegistry: Record<WidgetType, WidgetDefinition> = {
  'stats-summary': {
    type: 'stats-summary',
    displayName: 'Stats Summary',
    displayNameKey: 'widget.statsSummary',
    component: lazy(() => import('./StatsSummaryWidget')),
    minSize: PerWidgetMinSize['stats-summary'],
    defaultSize: WidgetDefaultSize['stats-summary'],
  },
  'open-positions': {
    type: 'open-positions',
    displayName: 'Open Positions',
    displayNameKey: 'widget.openPositions',
    component: lazy(() => import('./OpenPositionsWidget')),
    minSize: PerWidgetMinSize['open-positions'],
    defaultSize: WidgetDefaultSize['open-positions'],
  },
  'performance-chart': {
    type: 'performance-chart',
    displayName: 'Performance Chart',
    displayNameKey: 'widget.performanceChart',
    component: lazy(() => import('./PerformanceChartWidget')),
    minSize: PerWidgetMinSize['performance-chart'],
    defaultSize: WidgetDefaultSize['performance-chart'],
    defaultConfig: { timeframe: 'monthly' },
    configSchema: z
      .object({
        timeframe: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'ytd', 'all-time']),
      })
      .strict(),
  },
  'account-balances': {
    type: 'account-balances',
    displayName: 'Account Balances',
    displayNameKey: 'widget.accountBalances',
    component: lazy(() => import('./AccountBalancesWidget')),
    minSize: PerWidgetMinSize['account-balances'],
    defaultSize: WidgetDefaultSize['account-balances'],
  },
  'position-sizing': {
    type: 'position-sizing',
    displayName: 'Position Sizing',
    displayNameKey: 'widget.positionSizing',
    component: lazy(() => import('./PositionSizingWidget')),
    minSize: PerWidgetMinSize['position-sizing'],
    defaultSize: WidgetDefaultSize['position-sizing'],
  },
  'equity-curve': {
    type: 'equity-curve',
    displayName: 'Equity Curve',
    displayNameKey: 'widget.equityCurve',
    component: lazy(() => import('./EquityCurveWidget')),
    minSize: PerWidgetMinSize['equity-curve'],
    defaultSize: WidgetDefaultSize['equity-curve'],
  },
  'pnl-calendar': {
    type: 'pnl-calendar',
    displayName: 'P&L Calendar',
    displayNameKey: 'widget.pnlCalendar',
    component: lazy(() => import('./PnlCalendarWidget')),
    minSize: PerWidgetMinSize['pnl-calendar'],
    defaultSize: WidgetDefaultSize['pnl-calendar'],
  },
  'dimension-breakdown': {
    type: 'dimension-breakdown',
    displayName: 'Dimension Breakdown',
    displayNameKey: 'widget.dimensionBreakdown',
    component: lazy(() => import('./DimensionBreakdownWidget')),
    minSize: PerWidgetMinSize['dimension-breakdown'],
    defaultSize: WidgetDefaultSize['dimension-breakdown'],
  },
  'idx-tax-fees': {
    type: 'idx-tax-fees',
    displayName: 'IDX Tax & Fees',
    displayNameKey: 'widget.idxTaxFees',
    component: lazy(() => import('./IdxTaxFeesWidget')),
    minSize: PerWidgetMinSize['idx-tax-fees'],
    defaultSize: WidgetDefaultSize['idx-tax-fees'],
  },
  'daily-sheet': {
    type: 'daily-sheet',
    displayName: 'Today’s Sheet',
    displayNameKey: 'widget.dailySheet',
    component: lazy(() => import('./DailySheetWidget')),
    minSize: PerWidgetMinSize['daily-sheet'],
    defaultSize: WidgetDefaultSize['daily-sheet'],
  },
  'record-completeness': {
    type: 'record-completeness',
    displayName: 'Record Completeness',
    displayNameKey: 'widget.recordCompleteness',
    component: lazy(() => import('./RecordCompletenessWidget')),
    minSize: PerWidgetMinSize['record-completeness'],
    defaultSize: WidgetDefaultSize['record-completeness'],
  },
  'risk-control': {
    type: 'risk-control',
    displayName: 'Risk Control',
    displayNameKey: 'widget.riskControl',
    component: lazy(() => import('./RiskControlWidget')),
    minSize: PerWidgetMinSize['risk-control'],
    defaultSize: WidgetDefaultSize['risk-control'],
    // F3: the daily loss / trade limits live in the widget's own config, so a
    // self-hosted instance needs no migration or preferences endpoint for them.
    defaultConfig: { dailyLossLimit: '', maxDailyTrades: 0 },
    configSchema: z
      .object({
        dailyLossLimit: z.string().max(32).default(''),
        maxDailyTrades: z.number().int().min(0).max(100).default(0),
      })
      .strict(),
  },
};
