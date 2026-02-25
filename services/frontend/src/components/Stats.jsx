import React from 'react';

export default function Stats({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: 'Total', value: stats.total, color: '#6366f1' },
    { label: 'To Do', value: stats.todo, color: '#3b82f6' },
    { label: 'In Progress', value: stats.in_progress, color: '#f59e0b' },
    { label: 'Done', value: stats.done, color: '#22c55e' },
    { label: 'High Priority Open', value: stats.high_priority_open, color: '#ef4444' },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card" style={{ borderTopColor: card.color }}>
          <div className="stat-value">{card.value}</div>
          <div className="stat-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
