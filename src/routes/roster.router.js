import express from 'express';
import Joi from 'joi';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

// 선수 명단 유효성 검사
const characterPlayersSchema = Joi.object({
  characterPlayerId1: Joi.number().integer().required(),
  characterPlayerId2: Joi.number().integer().required(),
  characterPlayerId3: Joi.number().integer().required(),
});

// 출전 선수 명단 구성 API (JWT 인증)
router.post('/roster', authMiddleware, async (req, res, next) => {
  try {
    const validaion = await characterPlayersSchema.validateAsync(req.body);
    const { characterPlayerId1, characterPlayerId2, characterPlayerId3 } = validaion;
    if (
      characterPlayerId1 === characterPlayerId2 ||
      characterPlayerId1 === characterPlayerId3 ||
      characterPlayerId2 === characterPlayerId3
    ) {
      return res.status(409).json({ errorMessage: '선수 아이디가 중복되었습니다.' });
    }
    // ##################################################################################
    // authMiddleware에서 req.character로 캐릭터 객체를 넘겨주면 변경 필요
    const { userId } = req.user;
    const character = await prisma.character.findUnique({
      where: { UserId: userId },
      include: { CharacterPlayer: true, Roster: true },
    });
    // ##################################################################################
    const characterPlayerIds = [characterPlayerId1, characterPlayerId2, characterPlayerId3];
    for (const characterPlayerId of characterPlayerIds) {
      const characterPlayer = character.CharacterPlayer.find((characterPlayer) => {
        return characterPlayer.characterPlayerId === characterPlayerId;
      });

      if (!characterPlayer) {
        return res.status(400).json({ errorMessage: '선수 아이디가 유효하지 않습니다.' });
      }
    }

    // 출전 선수 명단 생성
    const roster = await prisma.$transaction(
      async (tx) => {
        // 출전 선수 캐릭터 보유 선수 명단에서 감소
        for (const characterPlayerId of characterPlayerIds) {
          await tx.characterPlayer.update({
            where: { characterPlayerId },
            data: { playerCount: { decrement: 1 } },
          });
        }

        let roster;
        // 명단 변경 이전 출전 선수가 없는 경우
        if (!character.Roster) {
          roster = await tx.roster.create({
            data: {
              CharacterId: character.characterId,
              CharacterPlayerId1: characterPlayerId1,
              CharacterPlayerId2: characterPlayerId2,
              CharacterPlayerId3: characterPlayerId3,
            },
          });
        }
        // 명단 변경 이전 출전 선수가 있는 경우
        else {
          roster = await tx.roster.update({
            where: { CharacterId: character.characterId },
            data: {
              CharacterPlayerId1: characterPlayerId1,
              CharacterPlayerId2: characterPlayerId2,
              CharacterPlayerId3: characterPlayerId3,
            },
          });
          // 명단 변경 이전 출전 선수 캐릭터 보유 선수 명단에 추가
          const {
            CharacterPlayerId1: preCharacterPlayerId1,
            CharacterPlayerId2: preCharacterPlayerId2,
            CharacterPlayerId3: preCharacterPlayerId3,
          } = character.Roster;
          const preRoster = [preCharacterPlayerId1, preCharacterPlayerId2, preCharacterPlayerId3];

          for (const preCharacterPlayerId of preRoster) {
            await tx.characterPlayer.update({
              where: { characterPlayerId: preCharacterPlayerId },
              data: { playerCount: { increment: 1 } },
            });
          }
        }

        return roster;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({
      message: '출전 선수 명단입니다.',
      data: {
        characterPlayerId1: roster.CharacterPlayerId1,
        characterPlayerId2: roster.CharacterPlayerId2,
        characterPlayerId3: roster.CharacterPlayerId3,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 출전 선수 명단 제거 API (JWT 인증)
router.delete('/roster', authMiddleware, async (req, res, next) => {
  try {
    // ##################################################################################
    // authMiddleware에서 req.character로 캐릭터 객체를 넘겨주면 변경 필요
    const { userId } = req.user;
    const character = await prisma.character.findUnique({
      where: { UserId: userId },
      include: { CharacterPlayer: true, Roster: true },
    });
    // ##################################################################################

    if (!character.Roster) {
      return res.status(404).json({ errorMessage: '출전 선수 명단이 존재하지 않습니다.' });
    }

    const { CharacterPlayerId1, CharacterPlayerId2, CharacterPlayerId3 } = character.Roster;
    const characterPlayerIds = [CharacterPlayerId1, CharacterPlayerId2, CharacterPlayerId3];

    await prisma.$transaction(async (tx) => {
      await tx.roster.delete({
        where: { CharacterId: character.characterId },
      });

      // 캐릭터 보유 선수 명단에 추가 (playerCount + 1)
      for (const characterPlayerId of characterPlayerIds) {
        await tx.characterPlayer.update({
          where: { characterPlayerId },
          data: { playerCount: { increment: 1 } },
        });
      }
    });

    return res.status(200).json({ message: '출전 선수 명단이 제거되었습니다.' });
  } catch (error) {
    next(error);
  }
});

// 출전 선수 명단 조회 API (JWT 인증)
router.get('/roster', authMiddleware, async (req, res, next) => {
  try {
    // ##################################################################################
    // authMiddleware에서 req.character로 캐릭터 객체를 넘겨주면 변경 필요
    const { userId } = req.user;
    const character = await prisma.character.findUnique({
      where: { UserId: userId },
      include: { CharacterPlayer: true, Roster: true },
    });
    // ##################################################################################

    if (!character.Roster) {
      return res.status(404).json({ errorMessage: '출전 선수 명단이 존재하지 않습니다.' });
    }

    const { CharacterPlayerId1, CharacterPlayerId2, CharacterPlayerId3 } = character.Roster;
    const characterPlayerIds = [CharacterPlayerId1, CharacterPlayerId2, CharacterPlayerId3];
    const players = [];

    for (const characterPlayerId of characterPlayerIds) {
      const characterPlayer = character.CharacterPlayer.find((characterPlayer) => {
        return characterPlayer.characterPlayerId === characterPlayerId;
      });

      const { playerId, upgradeLevel } = characterPlayer;
      const player = await prisma.player.findUnique({
        where: { playerId_upgradeLevel: { playerId, upgradeLevel } },
      });

      if (!player) {
        return res.status(404).json({ errorMessage: '요청한 선수를 찾을 수 없습니다.' });
      }

      players.push(player);
    }

    return res.status(200).json({ data: players });
  } catch (error) {
    next(error);
  }
});

// 출전 선수 명단 조회 API
router.get('/roster/:characterId', async (req, res, next) => {
  try {
    const { characterId } = req.params;

    const character = await prisma.character.findUnique({
      where: { characterId: +characterId },
      include: { CharacterPlayer: true, Roster: true },
    });

    if (!character) {
      return res.status(400).json({ errorMessage: '유효하지 않은 캐릭터 아이디입니다.' });
    }

    if (!character.Roster) {
      return res.status(404).json({ errorMessage: '출전 선수 명단이 존재하지 않습니다.' });
    }

    const { CharacterPlayerId1, CharacterPlayerId2, CharacterPlayerId3 } = character.Roster;
    const characterPlayerIds = [CharacterPlayerId1, CharacterPlayerId2, CharacterPlayerId3];
    const players = [];

    for (const characterPlayerId of characterPlayerIds) {
      const characterPlayer = character.CharacterPlayer.find((characterPlayer) => {
        return characterPlayer.characterPlayerId === characterPlayerId;
      });

      const { playerId, upgradeLevel } = characterPlayer;
      const player = await prisma.player.findUnique({
        where: { playerId_upgradeLevel: { playerId, upgradeLevel } },
      });

      if (!player) {
        return res.status(404).json({ errorMessage: '요청한 선수를 찾을 수 없습니다.' });
      }

      players.push(player);
    }

    return res.status(200).json({ data: players });
  } catch (error) {
    next(error);
  }
});

export default router;
