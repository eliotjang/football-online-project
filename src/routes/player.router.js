import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import Joi from 'joi';

const router = express.Router();

const upgradeLevelSchema = Joi.object({
  upgradeLevel: Joi.number().integer().min(0).max(5).required(),
});

const playerIdSchema = Joi.object({
  playerId: Joi.number().integer().required(),
});

// 보유 선수 목록 조회 (본인 팀) API (JWT 인증)
router.get('/character/players', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;

    const characterPlayers = await prisma.characterPlayer.findMany({
      where: {
        CharacterId: characterId,
      },
    });

    const characterPlayersData = [];
    for (const p of characterPlayers) {
      const player = await prisma.player.findFirst({
        where: {
          playerId: p.playerId,
          upgradeLevel: p.upgradeLevel,
        },
      });

      const playerData = {
        characterPlayerId: p.characterPlayerId,
        playerId: p.playerId,
        playerName: player.playerName,
        upgradeLevel: p.upgradeLevel,
        playerCount: p.playerCount,
      };
      characterPlayersData.push(playerData);
    }

    return res.status(200).json({ message: '현재 캐릭터가 보유한 선수 목록입니다.', data: characterPlayersData });
  } catch (err) {
    next(err);
  }
});

// 보유 선수 목록 조회 (타 팀) API
router.get('/character/players/:characterId', async (req, res, next) => {
  try {
    const { characterId } = req.params;

    const character = await prisma.character.findFirst({
      where: {
        characterId: +characterId,
      },
    });

    if (!character) {
      return res.status(400).json({ errerMessage: '유효하지 않은 캐릭터 아이디입니다.' });
    }

    const characterPlayers = await prisma.characterPlayer.findMany({
      where: {
        CharacterId: character.characterId,
      },
    });

    const characterPlayersData = [];
    for (const p of characterPlayers) {
      const player = await prisma.player.findFirst({
        where: {
          playerId: p.playerId,
          upgradeLevel: p.upgradeLevel,
        },
      });

      const playerData = {
        characterPlayerId: p.characterPlayerId,
        playerId: p.playerId,
        playerName: player.playerName,
        upgradeLevel: p.upgradeLevel,
        playerCount: p.playerCount,
      };
      characterPlayersData.push(playerData);
    }

    return res
      .status(200)
      .json({ message: `${character.name} 캐릭터가 보유한 선수 목록입니다.`, data: characterPlayersData });
  } catch (err) {
    next(err);
  }
});

router.get('/database/players', async (req, res, next) => {
  // 데이터 베이스 선수 목록 조회
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

router.get('/database/player/:playerId', async (req, res, next) => {
  // 데이터 베이스 단일 선수 목록 조회
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
