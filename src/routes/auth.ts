// src/routes/auth.ts
import express from 'express';
import prisma from '../../prisma/prisma';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Register a new user
router.post('/register', authenticateUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { name } = req.body;
    
    // Create a new user in our database
    const user = await prisma.user.create({
      data: {
        id: req.user.uid,
        email: req.user.email,
        name,
        financialData: {
          create: {} // Create empty financial data
        }
      },
      include: {
        financialData: true
      }
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Failed to register user' });
  }
});

// Get current user
router.get('/me', authenticateUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ message: 'Failed to get user information' });
  }
});

export default router;