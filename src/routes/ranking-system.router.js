import express from 'express';
//import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

// 유저 랭킹 조회 API
router.get('/ranking', async (req, res, next) => {
  try {
    // 모든 유저(캐릭터) 조회
    const characters = await prisma.character.findMany({});
    // 각 유저별로 점수, 승/무/패 합산

    // 점수 내림차순으로 정렬

    // 출력
  } catch (error) {
    next(error);
  }
});

export default router;
