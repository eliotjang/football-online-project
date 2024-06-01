import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

router.post('/games/play', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const myCharacter = await prisma.character.findUnique({
      where: {
        UserId: userId,
      },
    });

    let myGameScore = 0;

    // 모든 캐릭터 조회
    const characters = await prisma.character.findMany({});

    // 유저 랭크 점수 데이터
    let userData = [];

    // 각 유저별 랭크 점수 확인
    for (const character of characters) {
      const { characterId } = character;

      const gameRecord1 = await prisma.gameRecord.findMany({
        where: {
          characterId1: characterId,
        },
      });
      const gameRecord2 = await prisma.gameRecord.findMany({
        where: {
          characterId2: characterId,
        },
      });

      let wins = 0;
      let draws = 0;
      let losses = 0;

      for (const record of gameRecord1) {
        record.characterId1Win === true && wins++;
        record.characterId1Draw === true && draws++;
        record.characterId1Lose === true && losses++;
      }
      for (const record of gameRecord2) {
        record.characterId2Win === true && wins++;
        record.characterId2Draw === true && draws++;
        record.characterId2Lose === true && losses++;
      }

      const gameScore = 1000 + 10 * wins - 10 * losses;

      // 본인일 경우 제외
      if (myCharacter.characterId === character.characterId) {
        myGameScore = gameScore;
        continue;
      }

      const data = {
        characterId,
        name: character.name,
        gameScore,
      };

      userData.push(data);
    }

    // 점수 오름차순 정렬
    userData.sort((a, b) => {
      if (a.gameScore > b.gameScore) return 1;
      if (a.gameScore < b.gameScore) return -1;
    });

    // 점수 기반 상대 지정 (가장 가까운 점수)
    for (let i = 0; i < userData.length; i++) {}

    return res.status(200).json({
      message: `랭크 게임 승리!`,
      data: characters,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
