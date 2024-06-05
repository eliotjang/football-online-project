import express from 'express';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { prisma } from '../../utils/prisma/index.js';

const router = express.Router();

// 캐시 구매 API (JWT 인증)
router.patch('/character/cash', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const character = await prisma.character.findUnique({ where: { characterId } });
    const changedCharacter = await prisma.character.update({
      where: {
        characterId,
      },
      data: {
        cash: { increment: 1000 },
      },
    });

    return res.status(200).json({
      message: '1000 캐시가 구매되었습니다.',
      baseCash: `${character.cash} 캐시`,
      currentCash: `${changedCharacter.cash} 캐시`,
    });
  } catch (error) {
    next(error);
  }
});
export default router;
