import React from 'react';

const STATUS_LABELS = {
  todo: '📌 To Do',
  in_progress: '🔄 In Progress',
  done: '✅ Done',
};

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const NEXT_STATUS = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

export default function TaskList({ tasks, onUpdateStatus, onDelete }) {
  if (tasks.length === 0) {
    return <div className="empty-state">No tasks found. Create one to get started!</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div key={task.id} className={`task-card task-${task.status}`}>
          <div className="task-header">
            <span
              className="priority-badge"
              style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            >
              {task.priority}
            </span>
            <span className="task-status">{STATUS_LABELS[task.status]}</span>
          </div>

          <h3 className="task-title">{task.title}</h3>
          {task.description && <p className="task-desc">{task.description}</p>}

          {task.assigned_to && (
            <div className="task-assignee">👤 {task.assigned_to}</div>
          )}

          <div className="task-actions">
            <button
              className="btn btn-sm"
              onClick={() => onUpdateStatus(task.id, NEXT_STATUS[task.status])}
            >
              Move → {STATUS_LABELS[NEXT_STATUS[task.status]]}
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (window.confirm('Delete this task?')) onDelete(task.id);
              }}
            >
              Delete
            </button>
          </div>

          <div className="task-meta">
            Created: {new Date(task.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}
