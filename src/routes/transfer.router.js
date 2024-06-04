import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import Joi from 'joi';
import { Prisma } from '@prisma/client';

const router = express.Router();

const transferSchema = Joi.object({
  playerId: Joi.number().required(),
  upgradeLevel: Joi.number().required(),
  offerCash: Joi.number().required(),
});

// 이적 시장 등록 API
router.post('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const validation = await transferSchema.validateAsync(req.body);
    const { playerId, upgradeLevel, offerCash } = validation;

    const characterPlayer = await prisma.characterPlayer.findFirst({
      where: {
        CharacterId: characterId,
        playerId,
        upgradeLevel,
      },
    });
    if (!characterPlayer) {
      return res.status(404).json({ errorMessage: '해당 선수를 보유하고 있지 않습니다.' });
    }

    const targetPlayer = await prisma.player.findFirst({
      where: {
        playerId,
        upgradeLevel,
      },
    });

    const [transferMarket] = await prisma.$transaction(
      async (tx) => {
        if (characterPlayer.playerCount === 1) {
          await tx.characterPlayer.delete({
            where: { characterPlayerId: characterPlayer.characterPlayerId },
          });
        } else {
          await tx.characterPlayer.update({
            where: { characterPlayerId: characterPlayer.characterPlayerId },
            data: {
              playerCount: { decrement: 1 },
            },
          });
        }

        const transferMarket = await tx.transferMarket.create({
          data: {
            CharacterId: characterId,
            playerId,
            upgradeLevel,
            offerCash,
          },
        });

        return [transferMarket];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    const character = await prisma.character.findFirst({
      where: {characterId}
    })

    const data = {
      characterId,
      name: character.name,
      playerId,
      upgradeLevel,
      offerCash,
    }

    return res.status(201).json({ message: '이적 시장 등록이 완료되었습니다.', data });
  } catch (err) {
    next(err);
  }
});

// 이적 시장 조회 API
router.get('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const possibleTransferMarket = await prisma.transferMarket.findMany({
      where: { transferStatus: 'false' },
      select: {
        Character: {
          select: {
            characterId: true,
            name: true,
          },
        },
        playerId: true,
        playerName: targetPlayer.playerName,
        upgradeLevel: true,
        offerCash: true,
      },
    });

    return res.status(200).json({ message: '이적 시장 목록입니다', data: transferMarket });
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
    if (characterId === transferMarket.sellCharacterId) {
      return res.status(400).json({ errorMessage: '본인이 등록한 선수는 구매하지 못합니다' });
    }

    const buyCharacter = await prisma.character.findFirst({
      where: { characterId },
    });

    if (buyCharacter.cash < transferMarket.sellCash) {
      return res.status(400).json({ errorMessage: '보유하고 있는 캐시가 부족합니다.' });
    }

    await prisma.$transaction(
      async (tx) => {
        // 캐릭터 아이디 변경 (구매)
        const sellCharacterPlayer = await tx.characterPlayer.findFirst({
          where: { characterPlayerId: transferMarket.sellCharacterPlayerId },
        });

        const buyCharacterPlayer = await tx.characterPlayer.findFirst({
          where: {
            CharacterId: characterId,
            playerId: sellCharacterPlayer.playerId,
          },
        });

        if (!buyCharacterPlayer) {
          await tx.characterPlayer.create({
            data: {
              CharacterId: characterId,
              playerId: sellCharacterPlayer.playerId,
              upgradeLevel: transferMarket.sellCharacterPlayerUpgradeLevel,
              playerCount: 1,
            },
          });
        } else {
          await tx.characterPlayer.update({
            where: {
              characterPlayerId: buyCharacterPlayer.characterPlayerId,
            },
            data: {
              playerCount: { increment: 1 },
            },
          });
        }

        if (sellCharacterPlayer.playerCount === 0) {
          await tx.characterPlayer.delete({
            where: { characterPlayerId: transferMarket.sellCharacterPlayerId },
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
          where: { characterId: transferMarket.sellCharacterId },
          data: {
            cash: { increment: transferMarket.sellCash },
          },
        });

        // 이적 완료 표시
        await tx.transferMarket.update({
          where: { transferMarketId: +transferMarketId },
          data: {
            buyCharacterId: buyCharacter.characterId,
            buyCharacterName: buyCharacter.name,
            status: 'success',
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    const changedTransferMarket = await prisma.transferMarket.findFirst({
      where: { transferMarketId: +transferMarketId },
    });

    return res.status(200).json({ message: '이적이 성공적으로 완료되었습니다.', data: changedTransferMarket });
  } catch (err) {
    next(err);
  }
});

// 이적 등록 취소 API
router.delete('/transfer/:transferMarketId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const { transferMarketId } = req.params;

    const transferMarket = await prisma.transferMarket.findFirst({
      where: { transferMarketId: +transferMarketId },
      select: {
        transferMarketId: true,
        sellCharacterId: true,
        sellCharacterName: true,
        sellCharacterPlayerId: true,
        sellCharacterPlayerName: true,
        sellCharacterPlayerUpgradeLevel: true,
        sellCash: true,
      },
    });
    if (!transferMarket) {
      return res.status(404).json({ errorMessage: '해당 이적 시장이 존재하지 않습니다.' });
    }

    if (characterId !== transferMarket.sellCharacterId) {
      return res.status(400).json({ errorMessage: '해당 선수를 이적 시장에 등록한 캐릭터가 아닙니다.' });
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.transferMarket.delete({
          where: { transferMarketId: +transferMarketId },
        });

        await tx.characterPlayer.update({
          where: { characterPlayerId: transferMarket.sellCharacterPlayerId },
          data: {
            playerCount: { increment: 1 },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(200).json({ message: '이적 등록이 정상적으로 취소되었습니다', data: transferMarket });
  } catch (err) {
    next(err);
  }
});

export default router;
