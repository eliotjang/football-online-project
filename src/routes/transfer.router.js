import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import Joi from 'joi';
import { Prisma } from '@prisma/client';

const router = express.Router();

const transferSchema = Joi.object({
  sellCharacterPlayerId: Joi.number().required(),
  sellCash: Joi.number().required(),
});

// 이적 시장 등록 API
router.post('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const validation = await transferSchema.validateAsync(req.body);
    const { sellCharacterPlayerId, sellCash } = validation;

    const targetCharacterPlayer = await prisma.characterPlayer.findFirst({
      where: {
        CharacterId: characterId,
        characterPlayerId: sellCharacterPlayerId,
      },
    });
    if (!targetCharacterPlayer || targetCharacterPlayer.playerCount === 0) {
      return res.status(400).json({ errorMessage: '이적 시장 등록을 하려는 선수를 보유하고 있지 않습니다.' });
    }

    const character = await prisma.character.findFirst({
      where: { characterId },
    });

    const targetPlayer = await prisma.player.findFirst({
      where: { playerId: targetCharacterPlayer.playerId },
    });

    const [transferMarket] = await prisma.$transaction(
      async (tx) => {
        await tx.characterPlayer.update({
          where: { characterPlayerId: +sellCharacterPlayerId },
          data: {
            playerCount: { decrement: 1 },
          },
        });

        const transferMarket = await tx.transferMarket.create({
          data: {
            sellCharacterId: characterId,
            sellCharacterName: character.name,
            sellCharacterPlayerId,
            sellCharacterPlayerName: targetPlayer.playerName,
            sellCharacterPlayerUpgradeLevel: targetCharacterPlayer.upgradeLevel,
            sellCash,
          },
          select: {
            transferMarketId: true,
            sellCharacterId: true,
            sellCharacterName: true,
            sellCharacterPlayerId: true,
            sellCharacterPlayerName: true,
            sellCharacterPlayerUpgradeLevel: true,
            sellCash: true,
            status: true,
          },
        });

        return [transferMarket];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({ message: '이적 시장 등록이 완료되었습니다.', data: transferMarket });
  } catch (err) {
    next(err);
  }
});

// 이적 시장 조회 API
router.get('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const transferMarket = await prisma.transferMarket.findMany({
      where: { status: 'continue' },
      select: {
        transferMarketId: true,
        sellCharacterId: true,
        sellCharacterName: true,
        sellCharacterPlayerId: true,
        sellCharacterPlayerName: true,
        sellCharacterPlayerUpgradeLevel: true,
        sellCash: true,
        status: true,
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
    const { characterId } = req.character;
    const { transferMarketId } = req.params;

    const transferMarket = await prisma.transferMarket.findFirst({
      where: { transferMarketId: +transferMarketId },
    });
    if (!transferMarket) {
      return res.status(404).json({ errorMessage: '존재하지 않는 이적 시장입니다.' });
    }
    if (transferMarket.status === 'success') {
      return res.status(400).json({ errorMessage: '이적이 완료된 이적 시장입니다.' });
    }

    const character = prisma.character.findFirst({
      where: { characterId },
    });

    if (character.cash < transferMarket.sellCash) {
      return res.status(400).json({ errorMessage: '보유하고 있는 캐시가 부족합니다.' });
    }

    const [seller, buyer] = await prisma.$transaction(
      async (tx) => {
        const seller = await tx.character.findFirst({
          where: { characterId: transferMarket.sellerId },
        });

        const buyer = await tx.character.findFirst({
          where: { characterId },
        });

        // 캐릭터 아이디 변화 (거래)
        const targetPlayer = await tx.characterPlayer.findFirst({
          where: { characterPlayerId: transferMarket.sellPlayerId },
        });

        const buyerPlayer = await tx.characterPlayer.findFirst({
          where: {
            CharacterId: buyer.characterId,
            playerId: targetPlayer.playerId,
          },
        });

        if (targetPlayer.playerCount > 1 && !buyerPlayer) {
          // 파는 선수의 개수가 1보다 많으면서 사는 사람에게는 해당 선수가 없을 때
          await tx.characterPlayer.update({
            where: { characterPlayerId: transferMarket.sellPlayerId },
            data: {
              playerCount: { decrement: 1 },
            },
          });
          await tx.characterPlayer.create({
            data: {
              CharacterId: buyer.characterId,
              playerId: targetPlayer.playerId,
              upgradeLevel: targetPlayer.upgradeLevel,
              playerCount: 1,
            },
          });
        } else if (targetPlayer.playerCount > 1 && buyerPlayer) {
          await tx.characterPlayer.update({
            where: { characterPlayerId: transferMarket.sellPlayerId },
            data: {
              playerCount: { decrement: 1 },
            },
          });

          await tx.characterPlayer.update({
            where: {
              CharacterId: buyer.characterId,
              playerId: targetPlayer.playerId,
            },
            data: {
              playerCount: { increment: 1 },
            },
          });
        } else if (!(targetPlayer.playerCount > 1) && buyerPlayer) {
          await tx.characterPlayer.delete({
            where: { characterPlayerId: transferMarket.sellPlayerId },
          });
        } else {
          await tx.characterPlayer.update({
            where: {
              characterPlayerId: transferMarket.sellPlayerId,
            },
            data: {
              CharacterId: buyer.characterId,
            },
          });
        }

        // 구매한 사람 캐시 감소
        await tx.character.update({
          where: { characterId },
          data: {
            cash: { decrement: transferMarket.sellCash },
          },
        });

        // 판매한 사람 캐시 증가
        await tx.character.update({
          where: { characterId: seller.characterId },
          data: {
            cash: { increment: transferMarket.sellCash },
          },
        });

        // 이적 시장 거래 완료 표시
        await tx.transferMarket.update({
          where: { transferMarketId: transferMarket.transferMarketId },
          data: {
            buyerId: buyer.characterId,
            status: 'success',
          },
        });

        return [seller, buyer];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    const changedTransferMarket = await prisma.transferMarket.findFirst({
      where: { transferMarketId: transferMarket.transferMarketId },
    });
    console.log(changedTransferMarket);

    return res.status(200).json({ message: '이적이 성공적으로 완료되었습니다.', data: changedTransferMarket });
  } catch (err) {
    next(err);
  }
});

export default router;
