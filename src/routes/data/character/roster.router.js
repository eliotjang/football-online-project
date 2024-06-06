import express from 'express';
import Joi from 'joi';
import { prisma } from '../../../utils/prisma/index.js';
import Futsal from '../../../controllers/functions.js';

const router = express.Router();

// 캐릭터 아이디 유효성 검사
const characterIdSchema = Joi.object({
  characterId: Joi.number().integer().required(),
});

// 출전 선수 명단 조회 API
router.get('/data/character/:characterId/roster', async (req, res, next) => {
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

    return res.status(200).json({ message: `${character.name} 캐릭터의 출전 선수 명단입니다.`, data: players });
  } catch (error) {
    next(error);
  }
});

export default router;
