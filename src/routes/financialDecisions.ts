// src/routes/financialDecisions.ts
import express from 'express';
import prisma from '../../prisma/prisma';

const router = express.Router();

// Get all financial decisions
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const financialDecisions = await prisma.financialDecision.findMany({
      where: { userId: req.user.uid },
      orderBy: { date: 'desc' }
    });

    return res.status(200).json(financialDecisions);
  } catch (error) {
    console.error('Get financial decisions error:', error);
    return res.status(500).json({ message: 'Failed to get financial decisions' });
  }
});

// Create a new financial decision
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      title,
      amount,
      date,
      category,
      alternativeOption,
      expectedReturn
    } = req.body;

    // Validate required fields
    if (!title || !amount || !date || !category) {
      return res.status(400).json({ 
        message: 'Title, amount, date, and category are required' 
      });
    }

    const financialDecision = await prisma.financialDecision.create({
      data: {
        userId: req.user.uid,
        title,
        amount,
        date: new Date(date),
        category,
        alternativeOption,
        expectedReturn
      }
    });

    return res.status(201).json({
      message: 'Financial decision created successfully',
      financialDecision
    });
  } catch (error) {
    console.error('Create financial decision error:', error);
    return res.status(500).json({ message: 'Failed to create financial decision' });
  }
});

// Get a specific financial decision
router.get('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const financialDecision = await prisma.financialDecision.findFirst({
      where: {
        id,
        userId: req.user.uid
      }
    });

    if (!financialDecision) {
      return res.status(404).json({ message: 'Financial decision not found' });
    }

    return res.status(200).json(financialDecision);
  } catch (error) {
    console.error('Get financial decision error:', error);
    return res.status(500).json({ message: 'Failed to get financial decision' });
  }
});

// Analyze alternative scenario for a financial decision
router.post('/:id/analyze', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { alternativeOption, expectedReturn } = req.body;

    if (!alternativeOption || expectedReturn === undefined) {
      return res.status(400).json({ 
        message: 'Alternative option and expected return are required' 
      });
    }

    // Get the financial decision
    const financialDecision = await prisma.financialDecision.findFirst({
      where: {
        id,
        userId: req.user.uid
      }
    });

    if (!financialDecision) {
      return res.status(404).json({ message: 'Financial decision not found' });
    }

    // Update the financial decision with the alternative
    await prisma.financialDecision.update({
      where: { id },
      data: {
        alternativeOption,
        expectedReturn
      }
    });

    // Calculate the alternative scenario's impact
    const decisionDate = new Date(financialDecision.date);
    const currentDate = new Date();
    const monthsDifference = 
      (currentDate.getFullYear() - decisionDate.getFullYear()) * 12 + 
      (currentDate.getMonth() - decisionDate.getMonth());
    
    // Simple calculation of compound growth (for demonstration)
    const monthlyRate = expectedReturn / 100 / 12;
    const currentValue = financialDecision.amount;
    const alternativeValue = financialDecision.amount * 
      Math.pow(1 + monthlyRate, monthsDifference);
    
    const opportunityCost = alternativeValue - currentValue;

    return res.status(200).json({
      actualDecision: {
        title: financialDecision.title,
        amount: financialDecision.amount,
        date: financialDecision.date,
        currentValue
      },
      alternativeScenario: {
        option: alternativeOption,
        expectedReturn,
        projectedValue: alternativeValue
      },
      analysis: {
        opportunityCost,
        monthsElapsed: monthsDifference,
        percentageDifference: (opportunityCost / currentValue) * 100
      }
    });
  } catch (error) {
    console.error('Analyze financial decision error:', error);
    return res.status(500).json({ message: 'Failed to analyze financial decision' });
  }
});

// Delete a financial decision
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify ownership before deletion
    const financialDecision = await prisma.financialDecision.findFirst({
      where: {
        id,
        userId: req.user.uid
      }
    });

    if (!financialDecision) {
      return res.status(404).json({ message: 'Financial decision not found' });
    }

    await prisma.financialDecision.delete({
      where: { id }
    });

    return res.status(200).json({
      message: 'Financial decision deleted successfully'
    });
  } catch (error) {
    console.error('Delete financial decision error:', error);
    return res.status(500).json({ message: 'Failed to delete financial decision' });
  }
});

export default router;