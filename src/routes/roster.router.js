import express from 'express';
import Joi from 'joi';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import Futsal from '../controllers/functions.js';

const router = express.Router();

// 캐릭터 아이디 유효성 검사
const characterIdSchema = Joi.object({
  characterId: Joi.number().integer().required(),
});

// 출전 선수 명단 유효성 검사
const rosterSchema = Joi.object({
  roster1PlayerId: Joi.number().integer().required(),
  roster1UpgradeLevel: Joi.number().integer().required(),
  roster2PlayerId: Joi.number().integer().required(),
  roster2UpgradeLevel: Joi.number().integer().required(),
  roster3PlayerId: Joi.number().integer().required(),
  roster3UpgradeLevel: Joi.number().integer().required(),
});

// 출전 선수 명단 구성 API (JWT 인증)
router.post('/roster', authMiddleware, async (req, res, next) => {
  try {
    const validaion = await rosterSchema.validateAsync(req.body);
    const { roster1PlayerId, roster2PlayerId, roster3PlayerId } = validaion;

    if (
      roster1PlayerId === roster2PlayerId ||
      roster1PlayerId === roster3PlayerId ||
      roster2PlayerId === roster3PlayerId
    ) {
      return res.status(400).json({ errorMessage: '선수 아이디가 중복되었습니다.' });
    }

    const { characterId } = req.character;
    const character = await prisma.character.findUnique({
      where: { characterId },
      include: { CharacterPlayer: true, Roster: true },
    });

    const requestRosterPlayers = Futsal.rosterToRosterPlayers(validaion);

    for (const [playerId, upgradeLevel] of requestRosterPlayers) {
      const characterPlayer = character.CharacterPlayer.find((characterPlayer) => {
        return (
          characterPlayer.playerId === playerId &&
          characterPlayer.upgradeLevel === upgradeLevel &&
          characterPlayer.playerCount > 0
        );
      });
      if (!characterPlayer) {
        return res.status(400).json({ errorMessage: '선수 아이디가 유효하지 않습니다.' });
      }
    }

    // 출전 선수 명단 생성
    const roster = await prisma.$transaction(
      async (tx) => {
        const roster = await Futsal.addRoster(character.Roster, requestRosterPlayers, characterId, tx);

        // 명단 변경 이전 출전 선수 명단 확인
        const preRoster = Futsal.rosterToRosterPlayers(character.Roster);

        // 명단 변경 이전 출전 선수가 존재 시 보유 선수 명단에 추가
        if (preRoster) {
          for (const [playerId, upgradeLevel] of preRoster) {
            await Futsal.addCharacterPlayer(character.CharacterPlayer, characterId, playerId, upgradeLevel, tx);
          }
        }

        // 출전 선수는 캐릭터 보유 선수 명단에서 감소
        for (const [playerId, upgradeLevel] of requestRosterPlayers) {
          await Futsal.removeCharacterPlayer(character.CharacterPlayer, playerId, upgradeLevel, tx);
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
        roster1PlayerId: roster.roster1PlayerId,
        roster1UpgradeLevel: roster.roster1UpgradeLevel,
        roster2PlayerId: roster.roster2PlayerId,
        roster2UpgradeLevel: roster.roster2UpgradeLevel,
        roster3PlayerId: roster.roster3PlayerId,
        roster1UpgradeLevel: roster.roster1UpgradeLevel,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 출전 선수 명단 제거 API (JWT 인증)
router.delete('/roster', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const character = await prisma.character.findUnique({
      where: { characterId },
      include: { CharacterPlayer: true, Roster: true },
    });

    if (!character.Roster) {
      return res.status(404).json({ errorMessage: '출전 선수 명단이 존재하지 않습니다.' });
    }
    // 출전 선수 명단을 제거하고 기존 출전 선수들을 보유 선수 명단에 추가
    await prisma.$transaction(
      async (tx) => {
        // 출전 선수 명단 제거
        const preRoster = await Futsal.removeRoster(character.Roster, characterId, tx);
        const rosterPlayers = Futsal.rosterToRosterPlayers(preRoster);

        // 캐릭터 보유 선수 명단에 추가
        for (const [rosterPlayerId, rosterUpgradeLevel] of rosterPlayers) {
          await Futsal.addCharacterPlayer(
            character.CharacterPlayer,
            characterId,
            rosterPlayerId,
            rosterUpgradeLevel,
            tx
          );
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(200).json({ message: '출전 선수 명단이 제거되었습니다.' });
  } catch (error) {
    next(error);
  }
});

// 출전 선수 명단 조회 API (JWT 인증)
router.get('/roster', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const character = await prisma.character.findUnique({
      where: { characterId },
      include: { Roster: true },
    });

    if (!character.Roster) {
      return res.status(404).json({ errorMessage: '출전 선수 명단이 존재하지 않습니다.' });
    }

    const rosterPlayers = Futsal.rosterToRosterPlayers(character.Roster);
    const players = [];

    for (const [rosterPlayerId, rosterUpgradeLevel] of rosterPlayers) {
      const player = await prisma.player.findUnique({
        where: { playerId_upgradeLevel: { playerId: rosterPlayerId, upgradeLevel: rosterUpgradeLevel } },
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
    const validation = await characterIdSchema.validateAsync(req.params);
    const { characterId } = validation;

    const character = await prisma.character.findUnique({
      where: { characterId: +characterId },
      include: { Roster: true },
    });

    if (!character) {
      return res.status(404).json({ errorMessage: '요청한 캐릭터를 찾을 수 없습니다.' });
    }

    if (!character.Roster) {
      return res.status(404).json({ errorMessage: '해당 캐릭터의 출전 선수 명단이 존재하지 않습니다.' });
    }

    const rosterPlayers = Futsal.rosterToRosterPlayers(character.Roster);
    const players = [];

    for (const [rosterPlayerId, rosterUpgradeLevel] of rosterPlayers) {
      const player = await prisma.player.findUnique({
        where: { playerId_upgradeLevel: { playerId: rosterPlayerId, upgradeLevel: rosterUpgradeLevel } },
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
