import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

// 풋살 온라인 캐릭터 정보 조회 API (JWT 인증)
router.get('/character/info', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const character = await prisma.character.findUnique({
      where: {
        characterId,
      },
      select: {
        characterId: true,
        name: true,
        cash: true,
        releaseCount: true,
        rankScore: true,
        pityCount: true,
      },
    });

    return res.status(200).json({
      message: '캐릭터 정보입니다.',
      data: character,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
