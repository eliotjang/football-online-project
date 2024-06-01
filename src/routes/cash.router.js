import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

// 캐시 구매 API (JWT 인증)
router.patch('/cash', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    await prisma.character.update({
      where: {
        UserId: userId,
      },
      data: {
        cash: { increment: 1000 },
      },
    });
    const changedCharacter = await prisma.character.findUnique({
      where: {
        UserId: userId,
      },
    });

    return res.status(200).json({
      message: '1000 캐시가 구매되었습니다.',
      currentCash: changedCharacter.cash,
    });
  } catch (error) {
    next(error);
  }
});
export default router;
