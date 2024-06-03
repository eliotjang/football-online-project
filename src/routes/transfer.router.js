import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import Joi from 'joi';

const router = express.Router();

const transferSchema = Joi.object({
  sellPlayerId: Joi.number().required(),
  sellCash: Joi.number().required(),
});

// 이적 시장 등록 API
router.post('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const validation = await transferSchema.validateAsync(req.body);
    const { sellPlayerId, sellCash } = validation;

    const characterPlayer = await prisma.characterPlayer.findFirst({
      where: {
        CharacterId: characterId,
        characterPlayerId: sellPlayerId,
      },
    });
    if (!characterPlayer) {
      return res.status(400).json({ errorMessage: '이적 신청을 하려는 선수를 보유하고 있지 않습니다.' });
    }

    const transferMarket = await prisma.transferMarket.create({
      data: {
        sellerId: characterId,
        sellPlayerId,
        sellCash,
      },
      select: {
        transferMarketId: true,
        sellerId: true,
        sellPlayerId: true,
        sellCash: true,
        status: true,
      },
    });

    return res.status(201).json({ message: '이적 신청이 완료되었습니다.', data: transferMarket });
  } catch (err) {
    next(err);
  }
});

// 이적 시장 확인 API
router.get('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const transferMarket = await prisma.transferMarket.findMany({
      where: { status: 'continue' },
      select: {
        transferMarketId: true,
        sellerId: true,
        sellPlayerId: true,
        sellCash: true,
      },
    });

    return res.status(200).json({ message: '이적 시장 목록입니다', transferMarket });
  } catch (err) {
    next(err);
  }
});

// 이적 시장 구매 API
router.post('/transfer/:transferMarketId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { transferMarketId } = req.params;

    const transferMarket = prisma.transferMarket.findFirst({
      where: { transferMarketId: +transferMarketId },
    });
    if (!transferMarket) {
      return res.status(404).json({ errorMessage: '존재하지 않는 이적 시장입니다.' });
    }
    if (transferMarket.status === 'success') {
      return res.status(400).json({errorMessage: '이적이 완료된 이적 시장입니다.'})
    }

    const character = prisma.character.findFirst({
      where: {AccountId: userId}
    })

    if (character.cash < transferMarket.sellCash) {
      return res.status(400).json({ errorMessage: '보유하고 있는 캐시가 부족합니다.'})
    }

    const [seller, buyer] = await prisma.$transaction(
      async (tx) => {
        const seller = await tx.character.findFirst({
          where: {characterId: transferMarket.sellerId}
        })

      }
    )








  } catch (err) {
    next(err);
  }
});

export default router;
