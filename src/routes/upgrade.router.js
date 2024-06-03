import express from 'express';
import Joi from 'joi';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

// 강화 선수 유효성 검사
const targetCharacterPlayerSchema = Joi.object({
  characterPlayerId: Joi.number().integer().required(),
});

// 강화 재료 선수 유효성 검사
const upgradeMaterialSchema = Joi.object({
  upgradeMaterial: Joi.number().integer().required(),
});

// 강화 성공 시 true, 실패 시 false 반환
function upgrade(targetUpgradeLevel, materialUpgradeLevel) {
  const successProbability = [1, 0.8, 0.6, 0.4, 0.2];

  if (targetUpgradeLevel < materialUpgradeLevel) return true;
  else {
    const probability =
      successProbability[targetUpgradeLevel] * successProbability[targetUpgradeLevel - materialUpgradeLevel] * 100;

    if (probability < Math.floor(Math.random() * 100)) return false;
  }
  return true;
}

// 보유 선수 명단 추가
async function addCharacterPlayer(character, playerId, upgradeLevel, prisma) {
  let newCharacterPlayer;

  // 같은 선수를 보유 중인지 확인
  const characterPlayer = character.CharacterPlayer.find((characterPlayer) => {
    return characterPlayer.playerId === playerId && characterPlayer.upgradeLevel === upgradeLevel;
  });

  if (!characterPlayer) {
    newCharacterPlayer = await prisma.characterPlayer.create({
      data: {
        CharacterId: character.characterId,
        playerId,
        upgradeLevel,
        playerCount: 1,
      },
    });
  } else {
    newCharacterPlayer = await prisma.characterPlayer.update({
      where: { characterPlayerId: characterPlayer.characterPlayerId },
      data: { playerCount: { increment: 1 } },
    });
  }

  return newCharacterPlayer;
}

// 선수 강화 API 기능 구현 (JWT 인증)
router.post('/upgrade/:characterPlayerId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const character = await prisma.character.findUnique({
      where: { characterId },
      include: { CharacterPlayer: true },
    });

    const paramsValidation = await targetCharacterPlayerSchema.validateAsync(req.params);
    const { characterPlayerId: targetCharacterPlayerId } = paramsValidation;

    const targetCharacterPlayer = character.CharacterPlayer.find((characterPlayer) => {
      return characterPlayer.characterPlayerId === targetCharacterPlayerId;
    });

    if (!targetCharacterPlayer || targetCharacterPlayer.playerCount-- < 1) {
      return res.status(400).json({ errorMessage: '강화할 선수가 현재 보유한 선수가 아닙니다.' });
    }
    if (targetCharacterPlayer.upgradeLevel > 4) {
      return res.status(400).json({ errorMessage: '더 이상 강화할 수 없는 선수입니다.' });
    }

    const bodyValidaion = await upgradeMaterialSchema.validateAsync(req.body);
    const { upgradeMaterial: materialCharacterPlayerId } = bodyValidaion;

    const materialCharacterPlayer = character.CharacterPlayer.find((characterPlayer) => {
      return characterPlayer.characterPlayerId === materialCharacterPlayerId;
    });

    if (!materialCharacterPlayer || materialCharacterPlayer.playerCount-- < 1) {
      return res.status(400).json({ errorMessage: '강화 재료 선수가 현재 보유한 선수가 아닙니다.' });
    }

    if (targetCharacterPlayer.playerId !== materialCharacterPlayer.playerId) {
      return res.status(400).json({ errorMessage: '강화 재료 선수는 강화할 선수와 동일 선수여야 합니다.' });
    }

    // 강화 성공 판정
    const isSuccess = upgrade(targetCharacterPlayer.upgradeLevel, materialCharacterPlayer.upgradeLevel);

    const upgradedCharacterPlayer = await prisma.$transaction(
      async (tx) => {
        // 강화된 선수 추가
        let upgradedCharacterPlayer;

        // 강화 성공 시
        if (isSuccess) {
          upgradedCharacterPlayer = await addCharacterPlayer(
            character,
            targetCharacterPlayer.playerId,
            targetCharacterPlayer.upgradeLevel + 1,
            tx
          );
        }
        // 강화 실패 시
        else {
          upgradedCharacterPlayer = await addCharacterPlayer(character, targetCharacterPlayer.playerId, 0, tx);
        }

        // // 강화 선수 및 재료 소진
        for (const characterPlayer of [targetCharacterPlayer, materialCharacterPlayer]) {
          try {
            const deletedCharacterPlayer = await tx.characterPlayer.delete({
              where: { characterPlayerId: characterPlayer.characterPlayerId, playerCount: 1 },
            });
            if (!deletedCharacterPlayer) {
              await tx.characterPlayer.update({
                where: { characterPlayerId: characterPlayer.characterPlayerId },
                data: { playerCount: { decrement: 1 } },
              });
            }
          } catch {
            await tx.characterPlayer.update({
              where: { characterPlayerId: characterPlayer.characterPlayerId },
              data: { playerCount: { decrement: 1 } },
            });
          }
        }

        return upgradedCharacterPlayer;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(200).json({
      message: isSuccess ? '강화에 성공하였습니다!!' : '강화에 실패하였습니다...',
      baseData: await prisma.player.findUnique({
        where: {
          playerId_upgradeLevel: {
            playerId: targetCharacterPlayer.playerId,
            upgradeLevel: targetCharacterPlayer.upgradeLevel,
          },
        },
      }),
      changedData: await prisma.player.findUnique({
        where: {
          playerId_upgradeLevel: {
            playerId: upgradedCharacterPlayer.playerId,
            upgradeLevel: upgradedCharacterPlayer.upgradeLevel,
          },
        },
      }),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
