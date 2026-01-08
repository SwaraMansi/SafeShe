const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, connectDB } = require('../../server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await connectDB(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = Object.keys(mongoose.connection.collections);
  for (const name of collections) {
    await mongoose.connection.collections[name].deleteMany({});
  }
});

test('POST /api/auth/register and POST /api/auth/login flow', async () => {
  const user = { name: 'Alice', email: 'alice@example.com', password: 'secret123' };

  const registerRes = await request(app).post('/api/auth/register').send(user).expect(200);
  expect(registerRes.body).toHaveProperty('_id');
  expect(registerRes.body.email).toBe(user.email);

  const loginRes = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password }).expect(200);
  expect(loginRes.body).toHaveProperty('token');
  expect(loginRes.body).toHaveProperty('user');
  expect(loginRes.body.user.email).toBe(user.email);
});

test('POST /api/auth/login fails for wrong password', async () => {
  const user = { name: 'Bob', email: 'bob@example.com', password: 'correct' };
  await request(app).post('/api/auth/register').send(user).expect(200);

  await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong' }).expect(400);
});

test('POST /api/auth/login fails for missing email', async () => {
  await request(app).post('/api/auth/login').send({ password: 'whatever' }).expect(400);
});