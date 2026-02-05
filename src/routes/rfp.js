import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Apply auth to all routes
router.use(authMiddleware);

// List RFPs for user
router.get('/', async (req, res) => {
  try {
    const rfpAccess = await prisma.rfpAccess.findMany({
      where: { userId: req.user.id },
      include: {
        rfp: {
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            sections: {
              select: {
                id: true,
                questions: { select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: { rfp: { updatedAt: 'desc' } },
    });

    const rfps = rfpAccess.map(({ rfp, role }) => ({
      id: rfp.id,
      title: rfp.title,
      description: rfp.description,
      company: rfp.company,
      dueDate: rfp.dueDate,
      status: rfp.status,
      createdAt: rfp.createdAt,
      updatedAt: rfp.updatedAt,
      createdBy: rfp.createdBy,
      role,
      totalQuestions: rfp.sections.reduce((sum, s) => sum + s.questions.length, 0),
    }));

    res.json({ rfps });
  } catch (error) {
    console.error('List RFPs error:', error);
    res.status(500).json({ error: 'Failed to list RFPs' });
  }
});

// Get single RFP with sections and questions
router.get('/:rfpId', async (req, res) => {
  try {
    const { rfpId } = req.params;

    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
        access: {
          where: { userId: req.user.id },
          take: 1,
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!rfp) {
      return res.status(404).json({ error: 'RFP not found' });
    }

    // Check access
    const hasAccess = rfp.access.length > 0 || rfp.createdById === req.user.id;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ rfp });
  } catch (error) {
    console.error('Get RFP error:', error);
    res.status(500).json({ error: 'Failed to get RFP' });
  }
});

// Get answer for a specific question
router.get('/:rfpId/questions/:questionId/answer', async (req, res) => {
  try {
    const { rfpId, questionId } = req.params;

    // Verify access to RFP
    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      include: {
        access: { where: { userId: req.user.id }, take: 1 },
      },
    });

    if (!rfp) {
      return res.status(404).json({ error: 'RFP not found' });
    }

    const hasAccess = rfp.access.length > 0 || rfp.createdById === req.user.id;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the question with its answer
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        answer: true,
        answerJson: true,
        answeredAt: true,
        section: {
          select: { rfpId: true },
        },
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Verify question belongs to this RFP
    if (question.section.rfpId !== rfpId) {
      return res.status(403).json({ error: 'Question does not belong to this RFP' });
    }

    res.json({
      questionId: question.id,
      answer: question.answer,
      answerJson: question.answerJson ? JSON.parse(question.answerJson) : null,
      answeredAt: question.answeredAt,
    });
  } catch (error) {
    console.error('Get answer error:', error);
    res.status(500).json({ error: 'Failed to get answer' });
  }
});

// Save answer for a specific question
router.put('/:rfpId/questions/:questionId/answer', async (req, res) => {
  try {
    const { rfpId, questionId } = req.params;
    const { answer, answerJson } = req.body;

    // Verify access to RFP
    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      include: {
        access: { where: { userId: req.user.id }, take: 1 },
      },
    });

    if (!rfp) {
      return res.status(404).json({ error: 'RFP not found' });
    }

    const hasAccess = rfp.access.length > 0 || rfp.createdById === req.user.id;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify question exists and belongs to this RFP
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        section: { select: { rfpId: true } },
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.section.rfpId !== rfpId) {
      return res.status(403).json({ error: 'Question does not belong to this RFP' });
    }

    // Update the answer
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        answer: answer || null,
        answerJson: answerJson ? JSON.stringify(answerJson) : null,
        answeredAt: new Date(),
      },
      select: {
        id: true,
        answer: true,
        answerJson: true,
        answeredAt: true,
      },
    });

    res.json({
      success: true,
      questionId: updatedQuestion.id,
      answer: updatedQuestion.answer,
      answerJson: updatedQuestion.answerJson ? JSON.parse(updatedQuestion.answerJson) : null,
      answeredAt: updatedQuestion.answeredAt,
    });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

// Create RFP with dummy questions
router.post('/', async (req, res) => {
  try {
    const { title, description, company, dueDate } = req.body;

    const rfp = await prisma.rfp.create({
      data: {
        title,
        description,
        company,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'DRAFT',
        createdById: req.user.id,
        access: {
          create: { userId: req.user.id, role: 'ADMIN' },
        },
        sections: {
          create: [
            {
              title: 'Company Information',
              order: 1,
              questions: {
                create: [
                  { 
                    title: 'Q 1.1 - Company Overview', 
                    fullQuestion: 'Provide a brief overview of your company.', 
                    description: 'Include company history, mission, and core services.',
                    order: 1 
                  },
                  { title: 'Q 1.2 - Company History', fullQuestion: 'Describe your company history.', order: 2 },
                  { title: 'Q 1.3 - Certifications', fullQuestion: 'List all relevant certifications.', order: 3 },
                ],
              },
            },
            {
              title: 'Technical Requirements',
              order: 2,
              questions: {
                create: [
                  { title: 'Q 2.1 - System Architecture', fullQuestion: 'Describe your system architecture.', order: 1 },
                  { title: 'Q 2.2 - Scalability', fullQuestion: 'Explain your scalability approach.', order: 2 },
                  { title: 'Q 2.3 - API Integration', fullQuestion: 'Describe your API capabilities.', order: 3 },
                ],
              },
            },
            {
              title: 'Security & Compliance',
              order: 3,
              questions: {
                create: [
                  { title: 'Q 3.1 - Security Architecture', fullQuestion: 'Describe your security measures.', order: 1 },
                  { title: 'Q 3.2 - Data Protection', fullQuestion: 'How do you protect data?', order: 2 },
                ],
              },
            },
            {
              title: 'Pricing & Commercial',
              order: 4,
              questions: {
                create: [
                  { title: 'Q 4.1 - Pricing Model', fullQuestion: 'Provide pricing information.', order: 1 },
                  { title: 'Q 4.2 - Contract Terms', fullQuestion: 'What are your contract terms?', order: 2 },
                ],
              },
            },
          ],
        },
      },
      include: {
        sections: {
          include: { questions: true },
        },
      },
    });

    res.status(201).json({ rfp });
  } catch (error) {
    console.error('Create RFP error:', error);
    res.status(500).json({ error: 'Failed to create RFP' });
  }
});

// Delete RFP
router.delete('/:rfpId', async (req, res) => {
  try {
    const { rfpId } = req.params;

    const rfp = await prisma.rfp.findUnique({ where: { id: rfpId } });
    if (!rfp) {
      return res.status(404).json({ error: 'RFP not found' });
    }

    if (rfp.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Only creator can delete' });
    }

    await prisma.rfp.delete({ where: { id: rfpId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete RFP error:', error);
    res.status(500).json({ error: 'Failed to delete RFP' });
  }
});

export default router;