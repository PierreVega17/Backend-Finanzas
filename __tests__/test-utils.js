const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

let mongoServer;

const setupTestDB = async () => {
  try {
    await mongoose.disconnect();
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

const teardownTestDB = async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  }
};

const generateTestToken = (userId = '507f1f77bcf86cd799439011') => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1d' });
};

const createTestUser = async (User, userData = {}) => {
  const defaultUser = {
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  };

  const user = new User({
    ...defaultUser,
    ...userData
  });

  await user.save();
  return user;
};

// Agregar pruebas básicas para las utilidades
describe('Test Utilities', () => {
  it('should generate a valid JWT token', () => {
    const userId = '507f1f77bcf86cd799439011';
    const token = generateTestToken(userId);
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe(userId);
  });
});

module.exports = {
  setupTestDB,
  teardownTestDB,
  generateTestToken,
  createTestUser
}; 