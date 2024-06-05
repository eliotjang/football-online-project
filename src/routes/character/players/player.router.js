import express from 'express';
import { prisma } from '../../../utils/prisma/index.js';
import authMiddleware from '../../../middlewares/auth.middleware.js';

const router = express.Router();

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

export default router;
