import { CHART_GRADIENTS, CHART_COLORS } from './ChartConfig';

export function ChartGradients() {
  return (
    <defs>
      {/* Primary - Green */}
      <linearGradient id={CHART_GRADIENTS.primary} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
      </linearGradient>
      <linearGradient id={CHART_GRADIENTS.primaryFill} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
      </linearGradient>

      {/* Secondary - Blue */}
      <linearGradient id={CHART_GRADIENTS.secondary} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
      </linearGradient>
      <linearGradient id={CHART_GRADIENTS.secondaryFill} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.25} />
        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
      </linearGradient>

      {/* Danger - Red */}
      <linearGradient id={CHART_GRADIENTS.danger} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.25} />
        <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
      </linearGradient>
      <linearGradient id={CHART_GRADIENTS.dangerFill} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.2} />
        <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
      </linearGradient>

      {/* Warning - Amber */}
      <linearGradient id={CHART_GRADIENTS.warning} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.warning} stopOpacity={0.25} />
        <stop offset="95%" stopColor={CHART_COLORS.warning} stopOpacity={0} />
      </linearGradient>
      <linearGradient id={CHART_GRADIENTS.warningFill} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.warning} stopOpacity={0.2} />
        <stop offset="95%" stopColor={CHART_COLORS.warning} stopOpacity={0} />
      </linearGradient>

      {/* Stock In - Green */}
      <linearGradient id={CHART_GRADIENTS.stockIn} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
      </linearGradient>

      {/* Stock Out - Blue */}
      <linearGradient id={CHART_GRADIENTS.stockOut} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
      </linearGradient>

      {/* Wastage - Red */}
      <linearGradient id={CHART_GRADIENTS.wastage} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.3} />
        <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

export function ChartTooltipStyle() {
  return {
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#F1F5F9',
  };
}