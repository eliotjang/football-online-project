import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import Joi from 'joi';

const router = express.Router();

const tradeSchema = Joi.object({
  tradeCharacterId: Joi.number().integer().min(0).required(),
  tradeCharacterPlayerId: Joi.number().integer().min(0).required(),
  offerCash: Joi.number().integer().min(0).required(),
});

// 선수 트레이딩 API (JWT 인증)
router.patch('/character/player/trading/:characterPlayerId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const { characterPlayerId } = req.params;
    const { tradeCharacterId, tradeCharacterPlayerId, offerCash } = await tradeSchema.validateAsync(req.body);

    // 사용자 및 상대 캐릭터
    const myCharacter = await prisma.character.findUnique({ where: { characterId } });
    const targetCharacter = await prisma.character.findUnique({ where: { characterId: tradeCharacterId } });

    if (!myCharacter || !targetCharacter) {
      return res.status(400).json({ errorMessage: '유효하지 않은 캐릭터입니다.' });
    }

    // 사용자 및 상대 캐릭터 보유 선수
    const myCharacterPlayer = await prisma.characterPlayer.findUnique({
      where: { characterPlayerId: +characterPlayerId },
    });
    const targetCharacterPlayer = await prisma.characterPlayer.findUnique({
      where: { characterPlayerId: tradeCharacterPlayerId },
    });
    if (!myCharacterPlayer || !targetCharacterPlayer) {
      return res.status(400).json({ errorMessage: '유효하지 않은 캐릭터 보유 선수입니다.' });
    }

    // 사용자 및 상대 트레이드 선수
    const myPlayer = await prisma.player.findFirst({
      where: { playerId: myCharacterPlayer.playerId, upgradeLevel: myCharacterPlayer.upgradeLevel },
    });
    const targetPlayer = await prisma.player.findFirst({
      where: { playerId: targetCharacterPlayer.playerId, upgradeLevel: targetCharacterPlayer.upgradeLevel },
    });

    // 0. 트레이드 금액 제안 확인
    if (myCharacter.cash < offerCash) {
      return res.status(400).json({ errorMessage: '보유 캐시가 부족합니다.' });
    }
    let compareValuePrice = 0;
    if (myPlayer.value >= targetPlayer.value) {
      compareValuePrice = offerCash;
    }
    // myPlayer.value < targetPlayer.value
    else {
      if (myPlayer.value + offerCash > targetPlayer.value) {
        compareValuePrice = offerCash;
      } else {
        return res.status(200).json({ message: `${targetCharacter.name}님께서 트레이드 제안을 거절했습니다.` });
      }
    }

    // 1. 사용자 선수를 상대 보유 선수로 이동

    // 사용자 보유 선수 차감
    if (myCharacterPlayer.playerCount === 1) {
      await prisma.characterPlayer.delete({
        where: { characterPlayerId: +characterPlayerId },
      });
    } else {
      await prisma.characterPlayer.update({
        where: { characterPlayerId: +characterPlayerId },
        data: { playerCount: { decrement: 1 } },
      });
    }
    // 상대 보유 선수 테이블에서 사용자 보유 선수 확인
    const myCharacterPlayerTrade = await prisma.characterPlayer.findFirst({
      where: {
        CharacterId: tradeCharacterId,
        playerId: myCharacterPlayer.playerId,
        upgradeLevel: myCharacterPlayer.upgradeLevel,
      },
    });
    // 상대 보유 선수 테이블에 사용자 보유 선수 생성 or 개수 증가
    if (!myCharacterPlayerTrade) {
      const newMyCharacterPlayerTrade = await prisma.characterPlayer.create({
        data: {
          CharacterId: tradeCharacterId,
          playerId: myCharacterPlayer.playerId,
          upgradeLevel: myCharacterPlayer.upgradeLevel,
          playerCount: 1,
        },
      });
    } else {
      await prisma.characterPlayer.update({
        where: {
          characterPlayerId: myCharacterPlayerTrade.characterPlayerId,
        },
        data: {
          playerCount: { increment: 1 },
        },
      });
    }

    // 2. 상대 선수를 사용자 보유 선수로 이동

    // 상대 보유 선수 차감
    if (targetCharacterPlayer.playerCount === 1) {
      await prisma.characterPlayer.delete({
        where: { characterPlayerId: tradeCharacterPlayerId },
      });
    } else {
      await prisma.characterPlayer.update({
        where: { characterPlayerId: tradeCharacterPlayerId },
        data: { playerCount: { decrement: 1 } },
      });
    }
    // 사용자 보유 선수 테이블에서 상대 보유 선수 확인
    const targetCharacterPlayerTrade = await prisma.characterPlayer.findFirst({
      where: {
        CharacterId: characterId,
        playerId: targetCharacterPlayer.playerId,
        upgradeLevel: targetCharacterPlayer.upgradeLevel,
      },
    });
    // 사용자 보유 선수 테이블에 상대 보유 선수 생성 or 개수 증가
    if (!targetCharacterPlayerTrade) {
      const newTargetCharacterPlayerTrade = await prisma.characterPlayer.create({
        data: {
          CharacterId: characterId,
          playerId: targetCharacterPlayer.playerId,
          upgradeLevel: targetCharacterPlayer.upgradeLevel,
          playerCount: 1,
        },
      });
    } else {
      await prisma.characterPlayer.update({
        where: {
          characterPlayerId: targetCharacterPlayerTrade.characterPlayerId,
        },
        data: {
          playerCount: { increment: 1 },
        },
      });
    }

    // 3. 트레이드 선수 확인

    // 사용자 보유 선수에서 상대로 트레이드 완료된 선수 확인
    const tradedMyPlayer = await prisma.characterPlayer.findFirst({
      where: {
        CharacterId: tradeCharacterId,
        playerId: myCharacterPlayer.playerId,
        upgradeLevel: myCharacterPlayer.upgradeLevel,
      },
      select: {
        characterPlayerId: true,
        CharacterId: true,
        playerId: true,
        upgradeLevel: true,
      },
    });
    // 상대 보유 선수에서 사용자로 트레이드 완료된 선수 확인
    const tradedTargetPlayer = await prisma.characterPlayer.findFirst({
      where: {
        CharacterId: characterId,
        playerId: targetCharacterPlayer.playerId,
        upgradeLevel: targetCharacterPlayer.upgradeLevel,
      },
      select: {
        characterPlayerId: true,
        CharacterId: true,
        playerId: true,
        upgradeLevel: true,
      },
    });

    // 4. 선수 트레이드 비용 전달
    await prisma.character.update({
      where: { characterId: myCharacter.characterId },
      data: {
        cash: { decrement: compareValuePrice },
      },
    });
    await prisma.character.update({
      where: { characterId: targetCharacter.characterId },
      data: {
        cash: { increment: compareValuePrice },
      },
    });

    return res.status(200).json({
      message: `${myPlayer.playerName} 선수와 ${targetPlayer.playerName} 선수의 트레이딩이 완료되었습니다.`,
      cashMessage: `선수 트레이드 비용으로 ${compareValuePrice} 캐시가 소모되었습니다.`,
      myData: {
        charcterName: myCharacter.name,
        beforeTradePlayer: {
          playerName: myPlayer.playerName,
          characterPlayer: {
            characterPlayerId: myCharacterPlayer.characterPlayerId,
            CharacterId: myCharacterPlayer.CharacterId,
            playerId: myCharacterPlayer.playerId,
            upgradeLevel: myCharacterPlayer.upgradeLevel,
          },
        },
        afterTradePlayer: {
          playerName: targetPlayer.playerName,
          characterPlayer: tradedTargetPlayer,
        },
      },
      targetData: {
        charcterName: targetCharacter.name,
        beforeTradePlayer: {
          playerName: targetPlayer.playerName,
          characterPlayer: {
            characterPlayerId: targetCharacterPlayer.characterPlayerId,
            CharacterId: targetCharacterPlayer.CharacterId,
            playerId: targetCharacterPlayer.playerId,
            upgradeLevel: targetCharacterPlayer.upgradeLevel,
          },
        },
        afterTradePlayer: {
          playerName: myPlayer.playerName,
          characterPlayer: tradedMyPlayer,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
