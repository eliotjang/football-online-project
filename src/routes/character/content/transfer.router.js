import express from 'express';
import { prisma } from '../../../utils/prisma/index.js';
import authMiddleware from '../../../middlewares/auth.middleware.js';
import { Prisma } from '@prisma/client';
import { transferSchema, transferMarketIdSchema } from '../../../utils/joi-schema.js';

const router = express.Router();

// 이적 시장 등록 API
router.post('/character/content/transfer', authMiddleware, async (req, res, next) => {
  try {
    const { characterId, name } = req.character;
    const validation = await transferSchema.validateAsync(req.body);
    const { characterPlayerId, offerCash } = validation;

    const characterPlayer = await prisma.characterPlayer.findFirst({
      where: {
        characterPlayerId,
        CharacterId: characterId,
      },
    });
    if (!characterPlayer) {
      return res.status(404).json({ errorMessage: '해당 선수를 보유하고 있지 않습니다.' });
    }

    const targetPlayer = await prisma.player.findFirst({
      where: {
        playerId: characterPlayer.playerId,
        upgradeLevel: characterPlayer.upgradeLevel,
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
            playerId: characterPlayer.playerId,
            upgradeLevel: characterPlayer.upgradeLevel,
            offerCash,
          },
        });

        return [transferMarket];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    const data = {
      transferMarketId: transferMarket.transferMarketId,
      characterId,
      characterName: name,
      playerId: characterPlayer.playerId,
      playerName: targetPlayer.playerName,
      upgradeLevel: characterPlayer.upgradeLevel,
      offerCash,
    };

    return res.status(201).json({ message: '이적 시장 등록이 완료되었습니다.', data });
  } catch (err) {
    next(err);
  }
});

// 이적 시장 조회 API
router.get('/character/content/transfer', authMiddleware, async (req, res, next) => {
  try {
    const possibleTransferData = await prisma.transferMarket.findMany({
      where: { transferStatus: false },
    });
    const impossibleTransferData = await prisma.transferMarket.findMany({
      where: { transferStatus: true },
    });

    const possibleTransferMarket = [];
    const impossibleTransferMarket = [];

    for (const possibleMarket of possibleTransferData) {
      const targetPlayer = await prisma.player.findFirst({
        where: {
          playerId: possibleMarket.playerId,
          upgradeLevel: possibleMarket.upgradeLevel,
        },
      });
      const character = await prisma.character.findFirst({
        where: { characterId: possibleMarket.CharacterId },
      });

      const data = {
        transferMarketId: possibleMarket.transferMarketId,
        characterId: possibleMarket.CharacterId,
        characterName: character.name,
        playerId: possibleMarket.playerId,
        playerName: targetPlayer.playerName,
        upgradeLevel: possibleMarket.upgradeLevel,
        offerCash: possibleMarket.offerCash,
      };

      possibleTransferMarket.push(data);
    }

    for (const impossibleMarket of impossibleTransferData) {
      const targetPlayer = await prisma.player.findFirst({
        where: {
          playerId: impossibleMarket.playerId,
          upgradeLevel: impossibleMarket.upgradeLevel,
        },
      });
      const character = await prisma.character.findFirst({
        where: { characterId: impossibleMarket.CharacterId },
      });
      const transferCharacter = await prisma.character.findFirst({
        where: { characterId: impossibleMarket.transferCharacterId },
      });

      const data = {
        transferMarketId: impossibleMarket.transferMarketId,
        characterId: impossibleMarket.CharacterId,
        characterName: character.name,
        playerId: impossibleMarket.playerId,
        playerName: targetPlayer.playerName,
        upgradeLevel: impossibleMarket.upgradeLevel,
        offerCash: impossibleMarket.offerCash,
        transferCharacterId: transferCharacter.characterId,
        transferCharacterName: transferCharacter.name,
      };

      impossibleTransferMarket.push(data);
    }

    return res.status(200).json({ message: '이적 시장 목록입니다', possibleTransferMarket, impossibleTransferMarket });
  } catch (err) {
    next(err);
  }
});

// 이적 시장 구매 API
router.post('/character/content/transfer/:transferMarketId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId, cash, name } = req.character;
    const { transferMarketId } = await transferMarketIdSchema.validateAsync(req.params);

    const transferMarket = await prisma.transferMarket.findFirst({
      where: { transferMarketId: +transferMarketId },
    });

    if (!transferMarket) {
      return res.status(404).json({ errorMessage: '존재하지 않는 이적 시장입니다.' });
    }
    if (transferMarket.transferStatus === true) {
      return res.status(400).json({ errorMessage: '이적이 완료된 이적 시장입니다.' });
    }
    if (characterId === transferMarket.CharacterId) {
      return res.status(400).json({ errorMessage: '본인이 등록한 선수는 구매하지 못합니다' });
    }

    if (cash < transferMarket.offerCash) {
      return res.status(400).json({ errorMessage: '보유하고 있는 캐시가 부족합니다.' });
    }

    await prisma.$transaction(
      async (tx) => {
        // 이적 시장에서 선수 구매
        const transferCharacterPlayer = await tx.characterPlayer.findFirst({
          where: {
            CharacterId: characterId,
            playerId: transferMarket.playerId,
            upgradeLevel: transferMarket.upgradeLevel,
          },
        });

        if (!transferCharacterPlayer) {
          await tx.characterPlayer.create({
            data: {
              CharacterId: characterId,
              playerId: transferMarket.playerId,
              upgradeLevel: transferMarket.upgradeLevel,
              playerCount: 1,
            },
          });
        } else {
          await tx.characterPlayer.update({
            where: {
              characterPlayerId: transferCharacterPlayer.characterPlayerId,
            },
            data: {
              playerCount: { increment: 1 },
            },
          });
        }

        // 구매한 사람 캐시 감소
        await tx.character.update({
          where: { characterId },
          data: {
            cash: { decrement: transferMarket.offerCash },
          },
        });

        // 등록한 사람 캐시 증가
        await tx.character.update({
          where: { characterId: transferMarket.CharacterId },
          data: {
            cash: { increment: transferMarket.offerCash },
          },
        });

        // 이적 완료 표시
        await tx.transferMarket.update({
          where: { transferMarketId: +transferMarketId },
          data: {
            transferCharacterId: characterId,
            transferStatus: true,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    const character = await prisma.character.findFirst({
      where: { characterId: transferMarket.CharacterId },
    });

    const targetPlayer = await prisma.player.findFirst({
      where: {
        playerId: transferMarket.playerId,
        upgradeLevel: transferMarket.upgradeLevel,
      },
    });

    const data = {
      transferMarketId: +transferMarketId,
      characterId: transferMarket.CharacterId,
      characterName: character.name,
      playerId: transferMarket.playerId,
      playerName: targetPlayer.playerName,
      upgradeLevel: transferMarket.upgradeLevel,
      offerCash: transferMarket.offerCash,
      transferCharacterId: characterId,
      transferCharacterName: name,
    };

    return res.status(200).json({ message: '이적이 성공적으로 완료되었습니다.', data });
  } catch (err) {
    next(err);
  }
});

// 이적 등록 취소 API
router.delete('/character/content/transfer/:transferMarketId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId, name } = req.character;
    const { transferMarketId } = await transferMarketIdSchema.validateAsync(req.params);

    const transferMarket = await prisma.transferMarket.findFirst({
      where: { transferMarketId: +transferMarketId },
    });
    if (!transferMarket) {
      return res.status(404).json({ errorMessage: '해당 이적 시장이 존재하지 않습니다.' });
    }
    if (transferMarket.transferStatus === true) {
      return res.status(400).json({ errorMessage: '이적이 완료된 이적 시장입니다.' });
    }

    if (characterId !== transferMarket.CharacterId) {
      return res.status(400).json({ errorMessage: '해당 선수를 이적 시장에 등록한 캐릭터가 아닙니다.' });
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.transferMarket.delete({
          where: { transferMarketId: +transferMarketId },
        });

        const characterPlayer = await tx.characterPlayer.findFirst({
          where: {
            CharacterId: characterId,
            playerId: transferMarket.playerId,
            upgradeLevel: transferMarket.upgradeLevel,
          },
        });

        if (!characterPlayer) {
          await tx.characterPlayer.create({
            data: {
              CharacterId: characterId,
              playerId: transferMarket.playerId,
              upgradeLevel: transferMarket.upgradeLevel,
              playerCount: 1,
            },
          });
        } else {
          await tx.characterPlayer.update({
            where: { characterPlayerId: characterPlayer.characterPlayerId },
            data: {
              playerCount: { increment: 1 },
            },
          });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    const targetPlayer = await prisma.player.findFirst({
      where: {
        playerId: transferMarket.playerId,
        upgradeLevel: transferMarket.upgradeLevel,
      },
    });

    const data = {
      transferMarketId: transferMarket.transferMarketId,
      characterId: transferMarket.CharacterId,
      characterName: name,
      playerId: transferMarket.playerId,
      playerName: targetPlayer.playerName,
      upgradeLevel: transferMarket.upgradeLevel,
      offerCash: transferMarket.offerCash,
    };

    return res.status(200).json({ message: '이적 등록이 정상적으로 취소되었습니다', data });
  } catch (err) {
    next(err);
  }
});

export default router;
