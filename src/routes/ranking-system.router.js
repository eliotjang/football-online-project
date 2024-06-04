import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

// 유저 랭킹 조회 API
router.get('/characters/ranking', async (req, res, next) => {
  try {
    // 모든 캐릭터 조회
    const characters = await prisma.character.findMany({});

    // 유저 랭킹 데이터 배열 초기화
    let rankData = [];

    // 각 유저별 점수, 승/무/패 합산
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

      // 랭크 풋살 게임 API 기능 구현 시 추가 예정
      for (const record of gameRecord1) {
        record.characterId1Win === true && wins++;
        record.characterId1Lose === true && losses++;
      }
      for (const record of gameRecord2) {
        record.characterId2Win === true && wins++;
        record.characterId2Draw === true && draws++;
        record.characterId2Lose === true && losses++;
      }

      let winRate = '';
      const rate = Math.round((wins / (wins + losses + draws)) * 100);
      if (isNaN(rate)) {
        winRate = '0%';
      } else {
        winRate = `${rate}%`;
      }

      const gameScore = character.rankScore;

      const data = {
        rank: 0,
        characterId,
        name: character.name,
        gameScore,
        winRate,
        record: `${wins}승${draws}무${losses}패`,
      };

      rankData.push(data);
    }

    // 점수 내림차순으로 정렬
    rankData.sort((a, b) => {
      if (a.gameScore > b.gameScore) return -1;
      if (a.gameScore < b.gameScore) return 1;
    });

    // 랭크 순위 속성 추가
    rankData.forEach((data, index) => {
      data.rank = index + 1;
    });

    return res.status(200).json({
      message: '유저 랭킹 데이터입니다.',
      data: rankData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
