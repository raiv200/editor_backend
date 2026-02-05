import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * Generate TipTap Cloud JWT Token
 * 
 * This token authorizes a user to access specific documents on TipTap Cloud.
 * The token is signed with your App Secret from TipTap Cloud dashboard.
 * 
 * Document naming convention: rfp-{rfpId}-question-{questionId}
 */
router.post('/token', authMiddleware, async (req, res) => {
  try {
    const { rfpId } = req.body;

    if (!rfpId) {
      return res.status(400).json({ error: 'rfpId is required' });
    }

    // Check if TipTap is configured
    const appId = process.env.TIPTAP_APP_ID;
    const appSecret = process.env.TIPTAP_APP_SECRET;

    if (!appId || !appSecret) {
      return res.status(503).json({
        error: 'TipTap Cloud not configured',
        collaborationEnabled: false,
      });
    }

    // Verify user has access to this RFP
    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      include: {
        access: { where: { userId: req.user.id }, take: 1 },
        sections: {
          include: {
            questions: { select: { id: true } },
          },
        },
      },
    });

    if (!rfp) {
      return res.status(404).json({ error: 'RFP not found' });
    }

    const hasAccess = rfp.access.length > 0 || rfp.createdById === req.user.id;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate list of document names this user can access
    const allowedDocumentNames = rfp.sections
      .flatMap((s) => s.questions)
      .map((q) => `rfp-${rfpId}-question-${q.id}`);

    // Create TipTap JWT
    // Reference: https://tiptap.dev/docs/collaboration/getting-started/authenticate
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now,
      nbf: now,
      exp: now + 86400, // 24 hours
      iss: 'https://cloud.tiptap.dev',
      aud: appId,
      allowedDocumentNames,
    };

    const token = jwt.sign(payload, appSecret, { algorithm: 'HS256' });

    res.json({
      token,
      appId,
      documentNames: allowedDocumentNames,
      user: {
        id: req.user.id,
        name: req.user.name,
        color: req.user.color,
      },
    });
  } catch (error) {
    console.error('Generate token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Check if collaboration is enabled
router.get('/status', (req, res) => {
  const appId = process.env.TIPTAP_APP_ID;
  const appSecret = process.env.TIPTAP_APP_SECRET;

  res.json({
    collaborationEnabled: !!(appId && appSecret),
    appId: appId || null,
  });
});

export default router;
