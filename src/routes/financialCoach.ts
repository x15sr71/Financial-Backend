// src/routes/financialCoach.ts
import express from 'express';
import prisma from '../../prisma/prisma';

const router = express.Router();

interface FinancialData {
  userId: string;
  overallScore: number;
  emergencyFundScore: number;
  debtRatioScore: number;
  investmentAllocationScore: number;
  monthlySalary: number;
  freelanceIncome: number;
  rent: number;
  utilities: number;
  groceries: number;
  subscriptions: number;
  miscellaneous: number;
  emergencyFund: number;
  otherSavings: number;
}

interface RequestWithUser extends express.Request {
  user?: {
    uid: string;
    email: string;
  };
}

// Get financial health score and insights
router.get('/health-score', async (req: RequestWithUser, res) => {
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

    const healthScore = {
      overallScore: financialData.overallScore || 0,
      emergencyFundScore: financialData.emergencyFundScore || 0,
      debtRatioScore: financialData.debtRatioScore || 0,
      investmentAllocationScore: financialData.investmentAllocationScore || 0
    };

    const insights: {
      category: string;
      level: 'warning' | 'info' | 'success';
      message: string;
      recommendation: string;
    }[] = [];

    // Emergency Fund Insights
    if ((financialData.emergencyFundScore ?? 0) < 50) {
      insights.push({
        category: 'Emergency Fund',
        level: 'warning',
        message: 'Your emergency fund is below the recommended 3-6 months of expenses',
        recommendation: 'Try to increase your emergency fund by saving a small amount each month'
      });
    } else if ((financialData.emergencyFundScore ?? 0) < 80) {
      insights.push({
        category: 'Emergency Fund',
        level: 'info',
        message: 'Your emergency fund is on track but could be stronger',
        recommendation: 'Consider growing your emergency fund to cover 6 months of expenses'
      });
    } else {
      insights.push({
        category: 'Emergency Fund',
        level: 'success',
        message: 'Your emergency fund is well-established',
        recommendation: 'Your emergency fund is in great shape. Consider investing additional savings'
      });
    }

    // Debt Ratio Insights
    if ((financialData.debtRatioScore ?? 0) < 50) {
      insights.push({
        category: 'Debt Management',
        level: 'warning',
        message: 'Your debt payments are taking up a significant portion of your income',
        recommendation: 'Focus on paying down high-interest debt first and consider debt consolidation'
      });
    } else if ((financialData.debtRatioScore ?? 0) < 80) {
      insights.push({
        category: 'Debt Management',
        level: 'info',
        message: 'Your debt level is manageable but could be improved',
        recommendation: 'Continue making regular payments and avoid taking on new debt'
      });
    } else {
      insights.push({
        category: 'Debt Management',
        level: 'success',
        message: 'Your debt ratio is healthy',
        recommendation: 'You\'re maintaining a good debt-to-income ratio. Keep it up!'
      });
    }

    // Investment Allocation Insights
    if ((financialData.investmentAllocationScore ?? 0) < 50) {
      insights.push({
        category: 'Investments',
        level: 'warning',
        message: 'You\'re investing less than the recommended amount for long-term wealth building',
        recommendation: 'Try to increase your monthly SIP contributions, even by a small amount'
      });
    } else if ((financialData.investmentAllocationScore ?? 0) < 80) {
      insights.push({
        category: 'Investments',
        level: 'info',
        message: 'Your investment allocation is good but has room for improvement',
        recommendation: 'Consider increasing your investments to reach the 20% of income target'
      });
    } else {
      insights.push({
        category: 'Investments',
        level: 'success',
        message: 'You\'re investing well for your future',
        recommendation: 'Great job allocating funds to investments. Consider diversifying if you haven\'t already'
      });
    }

    // Savings Rate Insight
    const totalIncome = financialData.monthlySalary + financialData.freelanceIncome;
    const totalExpenses = financialData.rent + financialData.utilities +
                          financialData.groceries + financialData.subscriptions +
                          financialData.miscellaneous;
    const savingsRate = (totalIncome - totalExpenses) / totalIncome;

    if (savingsRate < 0.1) {
      insights.push({
        category: 'Savings Rate',
        level: 'warning',
        message: 'Your savings rate is below 10% of your income',
        recommendation: 'Look for areas to reduce expenses or increase income to boost your savings rate'
      });
    } else if (savingsRate >= 0.2) {
      insights.push({
        category: 'Savings Rate',
        level: 'success',
        message: 'You\'re saving more than 20% of your income',
        recommendation: 'Excellent savings rate! Consider allocating some of these savings to investments'
      });
    }

    return res.status(200).json({
      healthScore,
      insights
    });
  } catch (error) {
    console.error('Get health score error:', error);
    return res.status(500).json({ message: 'Failed to get health score' });
  }
});

// Get financial tips
router.get('/tips', async (req: RequestWithUser, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tips = [
      {
        id: 1,
        title: 'The 50/30/20 Rule',
        description: 'Allocate 50% of your income to needs, 30% to wants, and 20% to savings and debt repayment.'
      },
      {
        id: 2,
        title: 'Emergency Fund First',
        description: 'Before investing heavily, build an emergency fund covering 3-6 months of expenses.'
      },
      {
        id: 3,
        title: 'Pay Yourself First',
        description: 'Set up automatic transfers to your savings and investment accounts on payday.'
      },
      {
        id: 4,
        title: 'The Power of Compound Interest',
        description: 'Starting to invest early leads to significant wealth over time due to compounding.'
      },
      {
        id: 5,
        title: 'Debt Snowball Method',
        description: 'Pay off the smallest debt first, then roll that payment into the next one.'
      },
      {
        id: 6,
        title: 'Track Your Spending',
        description: 'Regularly review your expenses to make intentional financial decisions.'
      },
      {
        id: 7,
        title: 'Automate Your Finances',
        description: 'Set up automatic payments for bills, savings, and investments.'
      }
    ];

    const { id } = req.query;

    if (id) {
      const tipId = parseInt(id as string);
      const tip = tips.find(t => t.id === tipId);
      if (!tip) return res.status(404).json({ message: 'Tip not found' });
      return res.status(200).json(tip);
    }

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return res.status(200).json(randomTip);
  } catch (error) {
    console.error('Get tips error:', error);
    return res.status(500).json({ message: 'Failed to get financial tips' });
  }
});

// Answer financial questions
router.post('/ask', async (req: RequestWithUser, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { question } = req.body;

    if (!question) return res.status(400).json({ message: 'Question is required' });

    const financialData = await prisma.financialData.findUnique({
      where: { userId: req.user.uid }
    });

    if (!financialData) return res.status(404).json({ message: 'Financial data not found' });

    const safeFinancialData: FinancialData = {
      ...financialData,
      overallScore: financialData.overallScore ?? 0,
      emergencyFundScore: financialData.emergencyFundScore ?? 0,
      debtRatioScore: financialData.debtRatioScore ?? 0,
      investmentAllocationScore: financialData.investmentAllocationScore ?? 0
    };

    const faqs = [
      {
        patterns: ['save', '5l', '5 lakh', 'save money', 'savings goal'],
        response: (data: FinancialData) => {
          const totalIncome = data.monthlySalary + data.freelanceIncome;
          const totalExpenses = data.rent + data.utilities + data.groceries + data.subscriptions + data.miscellaneous;
          const currentSavings = totalIncome - totalExpenses;
          const targetAmount = 500000;
          const months = 24;
          const requiredMonthlySaving = targetAmount / months;
          const gap = Math.max(0, requiredMonthlySaving - currentSavings);

          return {
            response: `To save ₹5L in 2 years, you'd need to save approx. ₹${Math.round(requiredMonthlySaving)} per month.`,
            actions: [
              {
                type: 'Saving',
                recommendation: `Set aside ₹${Math.round(requiredMonthlySaving)} monthly`,
                impact: 'High'
              },
              {
                type: 'Spending',
                recommendation: gap > 0
                  ? `Reduce expenses by ₹${Math.round(gap)} monthly`
                  : 'Current savings rate is sufficient to meet this goal',
                impact: gap > 0 ? 'Medium' : 'Low'
              },
              {
                type: 'Investment',
                recommendation: 'Consider a recurring deposit or liquid fund for short-term goals',
                impact: 'Medium'
              }
            ]
          };
        }
      }
    ];

    const matchedFAQ = faqs.find(f => f.patterns.some(p => question.toLowerCase().includes(p)));
    const answer = matchedFAQ?.response(safeFinancialData);

    if (!answer) {
      return res.status(200).json({
        response: 'Sorry, I couldn’t find a personalized answer to that question. Please try rephrasing it.',
        actions: []
      });
    }

    return res.status(200).json(answer);
  } catch (error) {
    console.error('Ask route error:', error);
    return res.status(500).json({ message: 'Failed to answer question' });
  }
});

export default router;
