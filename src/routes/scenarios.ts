// src/routes/scenarios.ts
import express from 'express';
import prisma from '../../prisma/prisma';

const router = express.Router();

// Get all scenarios
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const scenarios = await prisma.scenarioConfig.findMany({
      where: { userId: req.user.uid },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(scenarios);
  } catch (error) {
    console.error('Get scenarios error:', error);
    return res.status(500).json({ message: 'Failed to get scenarios' });
  }
});

// Create a new scenario
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      name,
      newRent,
      jobSwitchSalary,
      sipInvestment,
      expenseGrowthRate,
      projectionTimeframe,
      oneTimeExpense
    } = req.body;

    // Validate required fields
    if (!name || !projectionTimeframe) {
      return res.status(400).json({ 
        message: 'Name and projection timeframe are required' 
      });
    }

    const scenario = await prisma.scenarioConfig.create({
      data: {
        userId: req.user.uid,
        name,
        newRent,
        jobSwitchSalary,
        sipInvestment,
        expenseGrowthRate,
        projectionTimeframe,
        oneTimeExpense
      }
    });

    return res.status(201).json({
      message: 'Scenario created successfully',
      scenario
    });
  } catch (error) {
    console.error('Create scenario error:', error);
    return res.status(500).json({ message: 'Failed to create scenario' });
  }
});

// Get a specific scenario
router.get('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const scenario = await prisma.scenarioConfig.findFirst({
      where: {
        id,
        userId: req.user.uid
      }
    });

    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }

    return res.status(200).json(scenario);
  } catch (error) {
    console.error('Get scenario error:', error);
    return res.status(500).json({ message: 'Failed to get scenario' });
  }
});

// Simulate a scenario and compare with current plan
router.post('/simulate', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      newRent,
      jobSwitchSalary,
      sipInvestment,
      expenseGrowthRate,
      projectionTimeframe,
      oneTimeExpense,
      scenarioId // Optional: if provided, will update the existing scenario
    } = req.body;

    // Get current financial data
    const financialData = await prisma.financialData.findUnique({
      where: { userId: req.user.uid }
    });

    if (!financialData) {
      return res.status(404).json({ message: 'Financial data not found' });
    }

    // Current values
    const currentRent = financialData.rent;
    const currentSalary = financialData.monthlySalary;
    const currentSIP = financialData.sipMonthly;
    
    // Use provided parameters or fall back to current values
    const simulatedRent = newRent !== undefined ? newRent : currentRent;
    const simulatedSalary = jobSwitchSalary !== undefined 
      ? jobSwitchSalary / 12 // Convert annual to monthly
      : currentSalary;
    const simulatedSIP = sipInvestment !== undefined ? sipInvestment : currentSIP;
    const simulatedExpenseGrowth = expenseGrowthRate !== undefined ? expenseGrowthRate / 100 : 0.05; // Default 5%
    const simulatedTimeframe = projectionTimeframe || 10; // Default 10 years
    const simulatedOneTimeExpense = oneTimeExpense || 0;

    // Calculate current financial metrics
    const currentIncome = financialData.monthlySalary + financialData.freelanceIncome;
    const currentExpenses = financialData.rent + financialData.utilities + 
                           financialData.groceries + financialData.subscriptions + 
                           financialData.miscellaneous;
    const currentSavings = currentIncome - currentExpenses;
    const currentInvestments = financialData.sipMonthly;
    const currentInitialNetWorth = financialData.emergencyFund + financialData.otherSavings;

    // Calculate what-if financial metrics
    const simulatedIncome = simulatedSalary + financialData.freelanceIncome;
    const simulatedExpenses = simulatedRent + financialData.utilities + 
                             financialData.groceries + financialData.subscriptions + 
                             financialData.miscellaneous;
    const simulatedSavings = simulatedIncome - simulatedExpenses;
    const simulatedInvestments = simulatedSIP;
    const simulatedInitialNetWorth = currentInitialNetWorth - simulatedOneTimeExpense;

    // Projection arrays for chart data
    const currentProjection: { year: number; netWorth: number }[] = [];
    const whatIfProjection: { year: number; netWorth: number }[] = [];
    
    // Investment return assumptions (annual)
    const investmentReturnRate = 0.10; // 10% annual return
    const monthlyReturnRate = investmentReturnRate / 12;
    
    // Calculate projections
    let currentNetWorth = currentInitialNetWorth;
    let whatIfNetWorth = simulatedInitialNetWorth;
    
    for (let month = 0; month <= simulatedTimeframe * 12; month++) {
      // Apply expense growth over time (compounded monthly)
      const currentMonthlyExpenseGrowth = Math.pow(1 + 0.05/12, month);
      const simulatedMonthlyExpenseGrowth = Math.pow(1 + simulatedExpenseGrowth/12, month);
      
      const currentMonthlyExpenses = currentExpenses * currentMonthlyExpenseGrowth;
      const simulatedMonthlyExpenses = simulatedExpenses * simulatedMonthlyExpenseGrowth;
      
      // Calculate monthly savings
      const currentMonthlySavings = currentIncome - currentMonthlyExpenses;
      const simulatedMonthlySavings = simulatedIncome - simulatedMonthlyExpenses;
      
      // Update net worth with savings and investment returns
      currentNetWorth = currentNetWorth * (1 + monthlyReturnRate) + 
                       currentMonthlySavings + currentInvestments;
      
      whatIfNetWorth = whatIfNetWorth * (1 + monthlyReturnRate) + 
                      simulatedMonthlySavings + simulatedInvestments;
      
      // Add data points for every 12 months (yearly)
      if (month % 12 === 0) {
        const year = month / 12;
        currentProjection.push({
          year,
          netWorth: Math.round(currentNetWorth)
        });
        
        whatIfProjection.push({
          year,
          netWorth: Math.round(whatIfNetWorth)
        });
      }
    }
    
    // Calculate summary metrics
    const finalCurrentNetWorth = currentProjection[currentProjection.length - 1].netWorth;
    const finalWhatIfNetWorth = whatIfProjection[whatIfProjection.length - 1].netWorth;
    const netWorthDifference = finalWhatIfNetWorth - finalCurrentNetWorth;
    const percentageGain = (netWorthDifference / finalCurrentNetWorth) * 100;
    
    // Save the scenario if requested
    let savedScenario: any = null;
    if (scenarioId) {
      // Update existing scenario
      savedScenario = await prisma.scenarioConfig.update({
        where: { id: scenarioId },
        data: {
          newRent,
          jobSwitchSalary,
          sipInvestment,
          expenseGrowthRate,
          projectionTimeframe,
          oneTimeExpense
        }
      });
    } else if (req.body.saveName) {
      // Create new scenario
      savedScenario = await prisma.scenarioConfig.create({
        data: {
          userId: req.user.uid,
          name: req.body.saveName,
          newRent,
          jobSwitchSalary,
          sipInvestment,
          expenseGrowthRate,
          projectionTimeframe,
          oneTimeExpense
        }
      });
    }

    return res.status(200).json({
      currentPlan: {
        initialNetWorth: currentInitialNetWorth,
        monthlySavings: currentSavings,
        monthlyInvestments: currentInvestments,
        finalNetWorth: finalCurrentNetWorth
      },
      whatIfScenario: {
        initialNetWorth: simulatedInitialNetWorth,
        monthlySavings: simulatedSavings,
        monthlyInvestments: simulatedInvestments,
        finalNetWorth: finalWhatIfNetWorth,
        oneTimeExpense: simulatedOneTimeExpense
      },
      projectionData: {
        currentProjection,
        whatIfProjection,
        timeframeYears: simulatedTimeframe
      },
      summary: {
        netWorthDifference,
        percentageGain: percentageGain.toFixed(1),
        savedScenario
      }
    });
  } catch (error) {
    console.error('Simulate scenario error:', error);
    return res.status(500).json({ message: 'Failed to simulate scenario' });
  }
});

// Update a scenario
router.put('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const {
      name,
      newRent,
      jobSwitchSalary,
      sipInvestment,
      expenseGrowthRate,
      projectionTimeframe,
      oneTimeExpense
    } = req.body;

    // Verify ownership before update
    const scenario = await prisma.scenarioConfig.findFirst({
      where: {
        id,
        userId: req.user.uid
      }
    });

    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }

    const updatedScenario = await prisma.scenarioConfig.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        newRent: newRent !== undefined ? newRent : undefined,
        jobSwitchSalary: jobSwitchSalary !== undefined ? jobSwitchSalary : undefined,
        sipInvestment: sipInvestment !== undefined ? sipInvestment : undefined,
        expenseGrowthRate: expenseGrowthRate !== undefined ? expenseGrowthRate : undefined,
        projectionTimeframe: projectionTimeframe !== undefined ? projectionTimeframe : undefined,
        oneTimeExpense: oneTimeExpense !== undefined ? oneTimeExpense : undefined
      }
    });

    return res.status(200).json({
      message: 'Scenario updated successfully',
      scenario: updatedScenario
    });
  } catch (error) {
    console.error('Update scenario error:', error);
    return res.status(500).json({ message: 'Failed to update scenario' });
  }
});

// Delete a scenario
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify ownership before deletion
    const scenario = await prisma.scenarioConfig.findFirst({
      where: {
        id,
        userId: req.user.uid
      }
    });

    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }

    await prisma.scenarioConfig.delete({
      where: { id }
    });

    return res.status(200).json({
      message: 'Scenario deleted successfully'
    });
  } catch (error) {
    console.error('Delete scenario error:', error);
    return res.status(500).json({ message: 'Failed to delete scenario' });
  }
});

export default router;