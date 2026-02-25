const request = require('supertest');
const app = require('../src/app');

// Mock the database module
jest.mock('../src/db/connection', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
  query: jest.fn(),
  testConnection: jest.fn(),
}));

const { query, pool } = require('../src/db/connection');

describe('Health Endpoints', () => {
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /ready returns 200 when DB is connected', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  test('GET /ready returns 503 when DB is down', async () => {
    pool.query.mockRejectedValueOnce(new Error('Connection refused'));
    
    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not ready');
  });
});

describe('Root Endpoint', () => {
  test('GET / returns service info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('myapp-backend');
  });
});

describe('Task Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/tasks returns paginated tasks', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })  // count query
      .mockResolvedValueOnce({                              // data query
        rows: [
          { id: '1', title: 'Task 1', status: 'todo', priority: 'high' },
          { id: '2', title: 'Task 2', status: 'done', priority: 'low' },
        ],
      });

    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test('POST /api/tasks creates a task', async () => {
    const newTask = {
      id: 'abc-123',
      title: 'New Task',
      description: 'Test description',
      status: 'todo',
      priority: 'high',
    };
    query.mockResolvedValueOnce({ rows: [newTask] });

    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'New Task', description: 'Test description', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Task');
  });

  test('POST /api/tasks rejects empty title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Title');
  });

  test('POST /api/tasks rejects invalid status', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test', status: 'invalid' });

    expect(res.status).toBe(400);
  });

  test('GET /api/tasks/:id returns 404 for missing task', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/tasks/nonexistent-id');
    expect(res.status).toBe(404);
  });

  test('DELETE /api/tasks/:id returns 204 on success', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'abc-123' }] });

    const res = await request(app).delete('/api/tasks/abc-123');
    expect(res.status).toBe(204);
  });

  test('PATCH /api/tasks/:id/status updates status', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'abc-123', title: 'Task', status: 'done' }],
    });

    const res = await request(app)
      .patch('/api/tasks/abc-123/status')
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });
});

describe('404 handling', () => {
  test('Unknown route returns 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
