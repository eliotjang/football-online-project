import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import { playerIdSchema, upgradeLevelSchema } from '../../utils/joi-schema.js';

const router = express.Router();

// 데이터 베이스 선수 목록 조회
router.get('/data/players', async (req, res, next) => {
  try {
    const player = await prisma.player.findMany({
      where: {
        upgradeLevel: 0,
      },
      orderBy: {
        playerId: 'asc',
      },
    });

    res.status(200).json({ player });
  } catch (err) {
    next(err);
  }
});

// 데이터 베이스 단일 선수 목록 조회
router.get('/data/player/:playerId', async (req, res, next) => {
  try {
    const { playerId } = await playerIdSchema.validateAsync(req.params);
    const { upgradeLevel } = await upgradeLevelSchema.validateAsync(req.body);

    const player = await prisma.player.findFirst({
      where: {
        playerId: +playerId,
        upgradeLevel,
      },
    });

    if (!player) {
      res.status(400).json({ message: '존재하지 않는 선수 입니다.' });
    }

    res.status(200).json({ player });
  } catch (err) {
    next(err);
  }
});

export default router;
