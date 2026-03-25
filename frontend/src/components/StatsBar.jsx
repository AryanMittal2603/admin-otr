export default function StatsBar({ stats }) {
  if (!stats) return null;

  const statusMap = {};
  (stats.byStatus || []).forEach(({ status, count }) => {
    statusMap[status] = count;
  });

  const cards = [
    { label: 'Total Calls', value: stats.total, color: 'text-blue-400' },
    { label: "Today's Calls", value: stats.today, color: 'text-emerald-400' },
    { label: 'Completed', value: statusMap['completed'] || statusMap['ANSWER'] || 0, color: 'text-green-400' },
    { label: 'Missed / Failed', value: (statusMap['missed'] || 0) + (statusMap['failed'] || 0) + (statusMap['NO ANSWER'] || 0), color: 'text-red-400' },
    { label: 'Avg Duration', value: `${stats.avgDuration}s`, color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map(({ label, value, color }) => (
        <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
