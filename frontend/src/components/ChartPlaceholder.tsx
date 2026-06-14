export default function ChartPlaceholder({ title = "Chart" }: { title?: string }) {
  return (
    <div className="chart-placeholder">
      <div className="chart-title">{title}</div>
      <div className="chart-body">(chart)</div>
    </div>
  );
}
