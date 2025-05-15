const mongoose = require('mongoose');
const Movement = require('../../models/movement');
const { setupTestDB, teardownTestDB } = require('../test-utils');

describe('Movement Model Test', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await Movement.deleteMany();
  });

  it('should create & save movement successfully', async () => {
    const validMovement = new Movement({
      user: new mongoose.Types.ObjectId(),
      type: 'income',
      amount: 1000,
      category: 'Salario',
      description: 'Salario mensual',
      date: new Date()
    });

    const savedMovement = await validMovement.save();
    
    expect(savedMovement._id).toBeDefined();
    expect(savedMovement.type).toBe(validMovement.type);
    expect(savedMovement.amount).toBe(validMovement.amount);
    expect(savedMovement.category).toBe(validMovement.category);
    expect(savedMovement.description).toBe(validMovement.description);
  });

  it('should fail to save movement without required fields', async () => {
    const movementWithoutRequiredField = new Movement({
      type: 'income',
      // amount is missing
      category: 'Salario'
    });

    let err;
    try {
      await movementWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });

  it('should fail to save movement with invalid type', async () => {
    const movementWithInvalidType = new Movement({
      user: new mongoose.Types.ObjectId(),
      type: 'invalid_type', // should be 'income' or 'expense'
      amount: 1000,
      category: 'Salario'
    });

    let err;
    try {
      await movementWithInvalidType.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.type).toBeDefined();
  });

  it('should fail to save movement with negative amount', async () => {
    const movementWithNegativeAmount = new Movement({
      user: new mongoose.Types.ObjectId(),
      type: 'income',
      amount: -1000,
      category: 'Salario'
    });

    let err;
    try {
      await movementWithNegativeAmount.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.amount).toBeDefined();
  });
}); 