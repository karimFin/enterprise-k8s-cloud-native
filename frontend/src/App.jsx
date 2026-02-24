import React, { useState, useEffect, useCallback } from 'react';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import Stats from './components/Stats';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [llmQuery, setLlmQuery] = useState('');
  const [llmMatches, setLlmMatches] = useState([]);
  const [llmQuestion, setLlmQuestion] = useState('');
  const [llmAnswer, setLlmAnswer] = useState('');
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState(null);
  const [llmIndexing, setLlmIndexing] = useState(false);
  const [llmIndexedCount, setLlmIndexedCount] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`${API_BASE}/api/tasks${params}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data.tasks);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [fetchTasks, fetchStats]);

  const createTask = async (task) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!res.ok) throw new Error('Failed to create task');
      setShowForm(false);
      fetchTasks();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update task');
      fetchTasks();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      fetchTasks();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const runSearch = async () => {
    if (!llmQuery.trim()) return;
    try {
      setLlmLoading(true);
      setLlmError(null);
      const res = await fetch(`${API_BASE}/api/llm/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: llmQuery.trim(), limit: 5 }),
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setLlmMatches(data.matches || []);
    } catch (err) {
      setLlmError(err.message);
    } finally {
      setLlmLoading(false);
    }
  };

  const askAssistant = async () => {
    if (!llmQuestion.trim()) return;
    try {
      setLlmLoading(true);
      setLlmError(null);
      const res = await fetch(`${API_BASE}/api/llm/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: llmQuestion.trim(), limit: 5 }),
      });
      if (!res.ok) throw new Error('Assistant failed');
      const data = await res.json();
      setLlmAnswer(data.answer || '');
      setLlmMatches(data.sources || []);
    } catch (err) {
      setLlmError(err.message);
    } finally {
      setLlmLoading(false);
    }
  };

  const reindexTasks = async () => {
    try {
      setLlmIndexing(true);
      setLlmError(null);
      const res = await fetch(`${API_BASE}/api/llm/reindex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Reindex failed');
      const data = await res.json();
      setLlmIndexedCount(data.indexed);
    } catch (err) {
      setLlmError(err.message);
    } finally {
      setLlmIndexing(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>📋 Task Manager v2</h1>
        <p className="subtitle">Full-Stack Kubernetes Demo</p>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <Stats stats={stats} />

      <section className="llm-panel">
        <div className="llm-header">
          <h2>LLM Search & Assistant</h2>
          <button className="btn btn-sm" onClick={reindexTasks} disabled={llmIndexing}>
            {llmIndexing ? 'Indexing...' : 'Index Tasks'}
          </button>
        </div>

        <div className="llm-row">
          <input
            className="llm-input"
            type="text"
            placeholder="Search tasks with natural language"
            value={llmQuery}
            onChange={(e) => setLlmQuery(e.target.value)}
          />
          <button className="btn btn-primary" onClick={runSearch} disabled={llmLoading}>
            Search
          </button>
        </div>

        <div className="llm-row">
          <input
            className="llm-input"
            type="text"
            placeholder="Ask a question about tasks"
            value={llmQuestion}
            onChange={(e) => setLlmQuestion(e.target.value)}
          />
          <button className="btn btn-primary" onClick={askAssistant} disabled={llmLoading}>
            Ask
          </button>
        </div>

        {llmError && <div className="llm-error">⚠️ {llmError}</div>}
        {llmIndexedCount !== null && (
          <div className="llm-meta">Indexed tasks: {llmIndexedCount}</div>
        )}
        {llmAnswer && <div className="llm-answer">{llmAnswer}</div>}

        <div className="llm-results">
          {llmMatches.map((match) => (
            <div key={match.id} className="llm-result">
              <div className="llm-title">{match.payload?.title || 'Untitled'}</div>
              {match.payload?.description && (
                <div className="llm-desc">{match.payload.description}</div>
              )}
              <div className="llm-meta">
                Score: {match.score?.toFixed ? match.score.toFixed(3) : match.score}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="toolbar">
        <div className="filters">
          {['all', 'todo', 'in_progress', 'done'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && <TaskForm onSubmit={createTask} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : (
        <TaskList tasks={tasks} onUpdateStatus={updateStatus} onDelete={deleteTask} />
      )}

      <footer className="footer">
        <span>Backend: {API_BASE || 'proxy'}</span>
        <span>Env: {import.meta.env.MODE}</span>
      </footer>
    </div>
  );
}
