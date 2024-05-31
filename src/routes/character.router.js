import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

// 풋살 온라인 캐릭터 정보 조회 API
/*
  authMiddleware 인증 추가되면 파라미터에 넣어 반영 예정
  ex) router.get('/character/info', authMiddleware, async (req, res, next) => {});
*/
router.get('/character/info', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const character = await prisma.character.findUnique({
      where: {
        UserId: userId,
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
