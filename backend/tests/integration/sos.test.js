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

test('POST /api/report/sos creates SOS report and returns risk', async () => {
  const res = await request(app).post('/api/report/sos').send({ description: 'Help me', location: { lat: 0.5, lng: 37 } }).expect(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.report).toHaveProperty('_id');
  expect(res.body.report.isSOS).toBe(true);
  expect(res.body.report.riskScore).toBeGreaterThanOrEqual(1);
});

test('POST /api/report/location stores location and returns risk', async () => {
  const res = await request(app).post('/api/report/location').send({ lat: 0.5, lng: 37 }).expect(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.risk).toHaveProperty('riskScore');
});