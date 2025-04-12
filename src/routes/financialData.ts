// src/routes/financialData.ts
import express from 'express';
import prisma from '../../prisma/prisma';

const router = express.Router();

// Get user's financial data
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const financialData = await prisma.financialData.findUnique({
      where: { userId: req.user.uid }
    });

    if (!financialData) {
      return res.status(404).json({ message: 'Financial data not found' });
    }

    // Calculate derived values
    const totalIncome = financialData.monthlySalary + financialData.freelanceIncome;
    const totalExpenses = financialData.rent + financialData.utilities + 
                         financialData.groceries + financialData.subscriptions + 
                         financialData.miscellaneous;
    const monthlySurplus = totalIncome - totalExpenses;
    
    // Calculate debt-free timeline (in months)
    const debtFreeMonths = financialData.monthlyEMI > 0 
      ? Math.ceil(financialData.totalDebt / financialData.monthlyEMI) 
      : 0;
    
    // Calculate emergency fund coverage
    const essentialExpenses = financialData.rent + financialData.utilities + financialData.groceries;
    const emergencyFundCoverage = essentialExpenses > 0 
      ? Math.floor(financialData.emergencyFund / essentialExpenses) 
      : 0;

    return res.status(200).json({
      ...financialData,
      totalIncome,
      totalExpenses,
      monthlySurplus,
      debtFreeMonths,
      emergencyFundCoverage
    });
  } catch (error) {
    console.error('Get financial data error:', error);
    return res.status(500).json({ message: 'Failed to get financial data' });
  }
});

// Update user's financial data
router.put('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      monthlySalary,
      freelanceIncome,
      rent,
      utilities,
      groceries,
      subscriptions,
      miscellaneous,
      totalDebt,
      monthlyEMI,
      emergencyFund,
      otherSavings,
      sipMonthly,
      lumpSumInvestment
    } = req.body;

    // Update financial data
    const updatedFinancialData = await prisma.financialData.update({
      where: { userId: req.user.uid },
      data: {
        monthlySalary: monthlySalary !== undefined ? monthlySalary : undefined,
        freelanceIncome: freelanceIncome !== undefined ? freelanceIncome : undefined,
        rent: rent !== undefined ? rent : undefined,
        utilities: utilities !== undefined ? utilities : undefined,
        groceries: groceries !== undefined ? groceries : undefined,
        subscriptions: subscriptions !== undefined ? subscriptions : undefined,
        miscellaneous: miscellaneous !== undefined ? miscellaneous : undefined,
        totalDebt: totalDebt !== undefined ? totalDebt : undefined,
        monthlyEMI: monthlyEMI !== undefined ? monthlyEMI : undefined,
        emergencyFund: emergencyFund !== undefined ? emergencyFund : undefined,
        otherSavings: otherSavings !== undefined ? otherSavings : undefined,
        sipMonthly: sipMonthly !== undefined ? sipMonthly : undefined,
        lumpSumInvestment: lumpSumInvestment !== undefined ? lumpSumInvestment : undefined,
      }
    });

    // Also create a historical snapshot
    await prisma.historicalData.upsert({
      where: {
        userId_month: {
          userId: req.user.uid,
          month: new Date(new Date().setDate(1)) // First day of current month
        }
      },
      update: {
        monthlySalary: monthlySalary !== undefined ? monthlySalary : undefined,
        freelanceIncome: freelanceIncome !== undefined ? freelanceIncome : undefined,
        rent: rent !== undefined ? rent : undefined,
        utilities: utilities !== undefined ? utilities : undefined,
        groceries: groceries !== undefined ? groceries : undefined,
        subscriptions: subscriptions !== undefined ? subscriptions : undefined,
        miscellaneous: miscellaneous !== undefined ? miscellaneous : undefined,
        totalDebt: totalDebt !== undefined ? totalDebt : undefined,
        monthlyEMI: monthlyEMI !== undefined ? monthlyEMI : undefined,
        emergencyFund: emergencyFund !== undefined ? emergencyFund : undefined,
        otherSavings: otherSavings !== undefined ? otherSavings : undefined,
        sipMonthly: sipMonthly !== undefined ? sipMonthly : undefined,
        lumpSumInvestment: lumpSumInvestment !== undefined ? lumpSumInvestment : undefined,
      },
      create: {
        userId: req.user.uid,
        month: new Date(new Date().setDate(1)), // First day of current month
        monthlySalary: monthlySalary || 0,
        freelanceIncome: freelanceIncome || 0,
        rent: rent || 0,
        utilities: utilities || 0,
        groceries: groceries || 0,
        subscriptions: subscriptions || 0,
        miscellaneous: miscellaneous || 0,
        totalDebt: totalDebt || 0,
        monthlyEMI: monthlyEMI || 0,
        emergencyFund: emergencyFund || 0,
        otherSavings: otherSavings || 0,
        sipMonthly: sipMonthly || 0,
        lumpSumInvestment: lumpSumInvestment || 0,
      }
    });

    // Calculate financial health scores
    const totalIncome = updatedFinancialData.monthlySalary + updatedFinancialData.freelanceIncome;
    const totalExpenses = updatedFinancialData.rent + updatedFinancialData.utilities + 
                         updatedFinancialData.groceries + updatedFinancialData.subscriptions + 
                         updatedFinancialData.miscellaneous;
    
    // Emergency fund score (based on months of coverage)
    const essentialExpenses = updatedFinancialData.rent + updatedFinancialData.utilities + updatedFinancialData.groceries;
    const emergencyFundCoverage = essentialExpenses > 0 
      ? Math.floor(updatedFinancialData.emergencyFund / essentialExpenses) 
      : 0;
    
    let emergencyFundScore = Math.min(Math.round((emergencyFundCoverage / 6) * 100), 100);
    
    // Debt ratio score (debt payments should ideally be < 36% of income)
    const debtRatio = totalIncome > 0 ? (updatedFinancialData.monthlyEMI / totalIncome) : 0;
    let debtRatioScore = Math.max(0, Math.round((1 - (debtRatio / 0.36)) * 100));
    
    // Investment allocation score (at least 20% of income should go to investments)
    const investmentRatio = totalIncome > 0 
      ? (updatedFinancialData.sipMonthly / totalIncome) 
      : 0;
    let investmentAllocationScore = Math.min(Math.round((investmentRatio / 0.2) * 100), 100);
    
    // Overall financial health score (weighted average)
    const overallScore = Math.round(
      (emergencyFundScore * 0.3) + 
      (debtRatioScore * 0.3) + 
      (investmentAllocationScore * 0.4)
    );
    
    // Update the scores
    await prisma.financialData.update({
      where: { userId: req.user.uid },
      data: {
        overallScore,
        emergencyFundScore,
        debtRatioScore,
        investmentAllocationScore
      }
    });

    return res.status(200).json({
      message: 'Financial data updated successfully',
      financialData: {
        ...updatedFinancialData,
        overallScore,
        emergencyFundScore,
        debtRatioScore,
        investmentAllocationScore
      }
    });
  } catch (error) {
    console.error('Update financial data error:', error);
    return res.status(500).json({ message: 'Failed to update financial data' });
  }
});

export default router;