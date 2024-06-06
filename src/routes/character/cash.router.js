import express from 'express';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { prisma } from '../../utils/prisma/index.js';
import Joi from 'joi';

const router = express.Router();

const cashSchema = Joi.object({
  cash: Joi.number().integer().min(0).required(),
});

// 캐시 구매 API (JWT 인증)
router.patch('/character/cash', authMiddleware, async (req, res, next) => {
  try {
    const { cash } = await cashSchema.validateAsync(req.body);
    const { characterId } = req.character;
    const character = await prisma.character.findUnique({ where: { characterId } });
    const changedCharacter = await prisma.character.update({
      where: {
        characterId,
      },
      data: {
        cash: { increment: cash },
      },
    });

    return res.status(200).json({
      message: `${cash} 캐시가 구매되었습니다.`,
      baseCash: `${character.cash} 캐시`,
      currentCash: `${changedCharacter.cash} 캐시`,
    });
  } catch (error) {
    next(error);
  }
});
export default router;
