const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../server');
const Movement = require('../../models/Movement');
const User = require('../../models/User');
const { setupTestDB, teardownTestDB, generateTestToken, createTestUser } = require('../test-utils');

describe('Movement Controller', () => {
  let token;
  let user;

  beforeAll(async () => {
    await setupTestDB();
    user = await createTestUser(User);
    token = generateTestToken(user._id);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await Movement.deleteMany({});
  });

  describe('POST /api/movements', () => {
    it('should create a new movement', async () => {
      const movement = {
        type: 'income',
        amount: 1000,
        category: 'Salario',
        description: 'Salario mensual',
        date: new Date()
      };

      const res = await request(app)
        .post('/api/movements')
        .set('Authorization', `Bearer ${token}`)
        .send(movement);

      expect(res.status).toBe(201);
      expect(res.body.type).toBe(movement.type);
      expect(res.body.amount).toBe(movement.amount);
      expect(res.body.category).toBe(movement.category);
      expect(res.body.description).toBe(movement.description);
      expect(res.body.user).toBe(user._id.toString());
    });

    it('should return 400 for invalid movement data', async () => {
      const invalidMovement = {
        type: 'invalid_type',
        amount: -1000
      };

      const res = await request(app)
        .post('/api/movements')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidMovement);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/movements', () => {
    beforeEach(async () => {
      const testDate = new Date('2024-01-01T12:00:00.000Z');
      console.log('Creating test movement with date:', testDate);
      
      const movement = await Movement.create({
        user: user._id,
        type: 'income',
        amount: 1000,
        category: 'Salario',
        description: 'Salario mensual',
        date: testDate
      });
      
      console.log('Created test movement:', movement);
    });

    it('should get all movements for a user', async () => {
      const res = await request(app)
        .get('/api/movements')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBe(1);
      expect(res.body[0].user).toBe(user._id.toString());
    });

    it('should filter movements by year', async () => {
      const res = await request(app)
        .get('/api/movements?year=2024')
        .set('Authorization', `Bearer ${token}`);

      console.log('Response body:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('should filter movements by year and month', async () => {
      const res = await request(app)
        .get('/api/movements?year=2024&month=1')
        .set('Authorization', `Bearer ${token}`);

      console.log('Response body:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  describe('PUT /api/movements/:id', () => {
    let movement;

    beforeEach(async () => {
      movement = await Movement.create({
        user: user._id,
        type: 'income',
        amount: 1000,
        category: 'Salario',
        description: 'Salario mensual',
        date: new Date()
      });
    });

    it('should update a movement', async () => {
      const updateData = {
        amount: 1500,
        description: 'Salario actualizado'
      };

      const res = await request(app)
        .put(`/api/movements/${movement._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(updateData.amount);
      expect(res.body.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent movement', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/movements/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 1500 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/movements/:id', () => {
    let movement;

    beforeEach(async () => {
      movement = await Movement.create({
        user: user._id,
        type: 'income',
        amount: 1000,
        category: 'Salario',
        description: 'Salario mensual',
        date: new Date()
      });
    });

    it('should delete a movement', async () => {
      const res = await request(app)
        .delete(`/api/movements/${movement._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      
      const deletedMovement = await Movement.findById(movement._id);
      expect(deletedMovement).toBeNull();
    });

    it('should return 404 for non-existent movement', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/movements/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
}); 