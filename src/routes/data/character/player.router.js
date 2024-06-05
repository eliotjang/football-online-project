import express from 'express';
import { prisma } from '../../../utils/prisma/index.js';

const router = express.Router();

// 보유 선수 목록 조회 (타 팀) API
router.get('/data/character/players/:characterId', async (req, res, next) => {
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

export default router;
