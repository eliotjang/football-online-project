import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

// 보유 선수 방출 API (JWT 인증)
router.delete('/players/:characterPlayerId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const { characterPlayerId } = req.params;
    const character = await prisma.character.findUnique({
      where: { characterId },
    });
    const characterPlayers = await prisma.characterPlayer.findMany({
      where: { CharacterId: character.characterId },
      select: { characterPlayerId: true, playerCount: true },
    });
    const characterPlayer = await prisma.characterPlayer.findUnique({
      where: { characterPlayerId: +characterPlayerId },
    });
    if (!characterPlayer) {
      return res.status(400).json({ errorMessage: '해당 선수를 보유하고 있지 않습니다.' });
    }
    if (characterPlayer.playerCount === 0) {
      return res.status(400).json({ errorMessage: '출전 선수 명단에 있는 선수입니다.' });
    }

    // 선수 방출
    if (characterPlayer.playerCount === 1) {
      await prisma.characterPlayer.delete({
        where: { characterPlayerId: +characterPlayerId },
      });
    } else {
      await prisma.characterPlayer.update({
        where: { characterPlayerId: +characterPlayerId },
        data: {
          playerCount: { decrement: 1 },
        },
      });
    }

    // 선수 방출 패널티 부여
    await prisma.character.update({
      where: { characterId },
      data: {
        releaseCount: { increment: 1 },
      },
    });

    // 방출 금액 정산
    const playerId = characterPlayer.playerId;
    const upgradeLevel = characterPlayer.upgradeLevel;
    const player = await prisma.player.findUnique({
      where: {
        playerId_upgradeLevel: { playerId, upgradeLevel },
      },
    });
    await prisma.character.update({
      where: { characterId },
      data: {
        cash: { increment: player.value },
      },
    });

    // 변경 금액 확인
    const currentCash = await prisma.character.findUnique({
      where: { characterId },
      select: { cash: true },
    });

    return res.status(200).json({
      message: `${player.playerName} 선수(${player.upgradeLevel}강)를 방출했습니다.`,
      currentCash: currentCash,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
