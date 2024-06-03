import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import Joi from 'joi';

const router = express.Router();

const transferSchema = Joi.object({
  sellPlayerId: Joi.number().required(),
  sellCash: Joi.number().required(),
});

// 이적 신청 API
router.post('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const { accountId } = req.account;
    const validation = await transferSchema.validateAsync(req.body);
    const { sellPlayerId, sellCash } = validation;

    const character = await prisma.character.findFirst({
      where: {AccountId: accountId}
    })

    const characterPlayer = await prisma.characterPlayer.findFirst({
      where: {
        CharacterId: character.characterId,
        characterPlayerId: sellPlayerId
      }
    })
    if (!characterPlayer) {
      return res.status(400).json({errorMessage: '이적 신청을 하려는 선수를 보유하고 있지 않습니다.'})
    }

    const transferMarket = await prisma.transferMarket.create({
      data: {
        sellerId: character.characterId,
        sellPlayerId,
        sellCash,
      },
      select: {
        transferMarketId: true,
        sellerId: true,
        sellPlayerId: true,
        sellCash: true,
        status: true,
      }
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
      where: {status: 'continue'},
      select: {
        transferMarketId: true,
        sellerId: true,
        sellPlayerId: true,
        sellCash: true,
      }
    })

    return res.status(200).json({ message: '이적 시장 목록입니다', requestTransfer, getTransfer, endTransfer });
  } catch (err) {
    next(err);
  }
});

// 이적 대상자의 거절/후제시 API
router.patch('/transfer/:playerTransferId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { response } = req.body;
    const { playerTransferId } = req.params;

    if (response === 'refuse') {
      await prisma.playerTransfer.update({
        where: { playerTransferId: +playerTransferId },
        data: {
          status: `${userId}_refuse`,
        },
      });
      return res.status(200).json({ message: '이적을 거절했습니다' });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
