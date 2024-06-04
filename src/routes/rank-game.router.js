import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

// 랭크 풋살 게임 API (JWT 인증)
router.post('/game-content/futsal/rank-game', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const myCharacter = await prisma.character.findUnique({
      where: {
        characterId,
      },
    });

    const isExistRoster = await prisma.roster.findUnique({
      where: {
        CharacterId: characterId,
      },
    });
    if (!isExistRoster) {
      return res.status(400).json({ message: '출전 선수 명단이 존재하지 않습니다.' });
    }

    let myRankScore = myCharacter.rankScore;

    // 모든 캐릭터 조회
    const characters = await prisma.character.findMany({});

    // 랭크 유저 데이터
    let userData = [];

    // 각 유저별 랭크 점수 확인
    for (const character of characters) {
      const { characterId } = character;

      // 사용자인 경우 제외
      if (myCharacter.characterId === character.characterId) {
        continue;
      }

      // 출전 선수 명단이 없는 경우 제외
      const isExistRoster = await prisma.roster.findUnique({
        where: {
          CharacterId: character.characterId,
        },
      });
      if (!isExistRoster) {
        continue;
      }

      const data = {
        characterId,
        name: character.name,
        rankScore: character.rankScore,
      };

      userData.push(data);
    }

    // 점수 오름차순 정렬
    userData.sort((a, b) => {
      if (a.rankScore > b.rankScore) return 1;
      if (a.rankScore < b.rankScore) return -1;
    });

    // 점수 기반 상대 지정 (가장 가까운 점수)
    let scoreArr = [];
    for (let i = 0; i < userData.length; i++) {
      scoreArr.push(Math.abs(myRankScore - userData[i].rankScore));
    }
    const minScore = Math.min(...scoreArr);
    const minScoreIdx = scoreArr.indexOf(minScore);
    const targetData = userData[minScoreIdx];

    // 사용자 및 상대 출전 선수 명단 확인
    const myRoster = await prisma.roster.findUnique({
      where: {
        CharacterId: myCharacter.characterId,
      },
    });
    const targetRoster = await prisma.roster.findUnique({
      where: {
        CharacterId: targetData.characterId,
      },
    });

    // 사용자 출전 선수 스탯 정규화
    let myNormalizationScore = 0;

    const myPlayer1 = await prisma.player.findFirst({
      where: {
        playerId: myRoster.roster1PlayerId,
        upgradeLevel: myRoster.roster1UpgradeLevel,
      },
    });
    const myPlayer2 = await prisma.player.findFirst({
      where: {
        playerId: myRoster.roster2PlayerId,
        upgradeLevel: myRoster.roster2UpgradeLevel,
      },
    });
    const myPlayer3 = await prisma.player.findFirst({
      where: {
        playerId: myRoster.roster3PlayerId,
        upgradeLevel: myRoster.roster3UpgradeLevel,
      },
    });

    const myPlayers = [myPlayer1, myPlayer2, myPlayer3];

    for (let i = 0; i < myPlayers.length; i++) {
      myNormalizationScore +=
        myPlayers[i].playerSpeed * 0.1 +
        myPlayers[i].goalDecision * 0.25 +
        myPlayers[i].shootPower * 0.15 +
        myPlayers[i].defence * 0.3 +
        myPlayers[i].stamina * 0.2;
    }

    // 상대 출전 선수 스탯 정규화
    let targetNormalizationScore = 0;

    const targetPlayer1 = await prisma.player.findFirst({
      where: {
        playerId: targetRoster.roster1PlayerId,
        upgradeLevel: targetRoster.roster1UpgradeLevel,
      },
    });
    const targetPlayer2 = await prisma.player.findFirst({
      where: {
        playerId: targetRoster.roster2PlayerId,
        upgradeLevel: targetRoster.roster2UpgradeLevel,
      },
    });
    const targetPlayer3 = await prisma.player.findFirst({
      where: {
        playerId: targetRoster.roster3PlayerId,
        upgradeLevel: targetRoster.roster3UpgradeLevel,
      },
    });

    const targetPlayers = [targetPlayer1, targetPlayer2, targetPlayer3];

    for (let i = 0; i < targetPlayers.length; i++) {
      targetNormalizationScore +=
        targetPlayers[i].playerSpeed * 0.1 +
        targetPlayers[i].goalDecision * 0.25 +
        targetPlayers[i].shootPower * 0.15 +
        targetPlayers[i].defence * 0.3 +
        targetPlayers[i].stamina * 0.2;
    }

    // 풋살 게임 로직 (랜덤 기반)
    const maxScore = myNormalizationScore + targetNormalizationScore;
    const maxTime = 90;
    let currentTime = 0;
    let myGoal = 0;
    let targetGoal = 0;
    const gameLog = [];
    gameLog.push('[경기 실시간 골 점수 기록]');

    let characterId1Win = false;
    let characterId1Draw = false;
    let characterId1Lose = false;
    let characterId2Win = false;
    let characterId2Draw = false;
    let characterId2Lose = false;

    // 시간별 실시간 골 점수 기록
    currentTime += Math.floor(Math.random() * 90);
    while (currentTime <= maxTime) {
      const randomValue = Math.random() * maxScore;
      const addScorePlayer = Math.floor(Math.random() * 3);
      if (randomValue < myNormalizationScore) {
        myGoal++;
        gameLog.push({
          time: `${currentTime}분`,
          team: `${myCharacter.name} 팀`,
          goalPlayer: myPlayers[addScorePlayer].playerName,
        });
      } else {
        targetGoal++;
        gameLog.push({
          time: `${currentTime}분`,
          team: `${targetData.name} 팀`,
          goalPlayer: targetPlayers[addScorePlayer].playerName,
        });
      }
      currentTime += Math.floor(Math.random() * 45);
    }

    // 사용자 팀 승리
    if (myGoal > targetGoal) {
      await prisma.character.update({
        where: {
          characterId: myCharacter.characterId,
        },
        data: {
          rankScore: { increment: 10 },
        },
      });
      await prisma.character.update({
        where: {
          characterId: targetData.characterId,
        },
        data: {
          rankScore: { decrement: 10 },
        },
      });

      characterId1Win = true;
      characterId2Lose = true;

      await prisma.gameRecord.create({
        data: {
          characterId1: myCharacter.characterId,
          characterId2: targetData.characterId,
          characterId1Win,
          characterId1Draw,
          characterId1Lose,
          characterId2Win,
          characterId2Draw,
          characterId2Lose,
        },
      });

      return res.status(200).json({
        message: `${myCharacter.name} 팀이 승리했습니다. 축하드립니다!`,
        result: `${myCharacter.name} ${myGoal} - ${targetGoal} ${targetData.name}`,
        gameLog: gameLog,
      });
    }
    // 사용자 팀 패배
    if (myGoal < targetGoal) {
      await prisma.character.update({
        where: {
          characterId: myCharacter.characterId,
        },
        data: {
          rankScore: { decrement: 10 },
        },
      });
      await prisma.character.update({
        where: {
          characterId: targetData.characterId,
        },
        data: {
          rankScore: { increment: 10 },
        },
      });

      characterId1Lose = true;
      characterId2Win = true;

      await prisma.gameRecord.create({
        data: {
          characterId1: myCharacter.characterId,
          characterId2: targetData.characterId,
          characterId1Win,
          characterId1Draw,
          characterId1Lose,
          characterId2Win,
          characterId2Draw,
          characterId2Lose,
        },
      });

      return res.status(200).json({
        message: `${myCharacter.name} 팀이 패배했습니다. 좋은 선수로 구성해보세요!`,
        result: `${myCharacter.name} ${myGoal} - ${targetGoal} ${targetData.name}`,
        gameLog: gameLog,
      });
    }
    // 무승부
    if (myGoal === targetGoal) {
      characterId1Draw = true;
      characterId2Draw = true;

      await prisma.gameRecord.create({
        data: {
          characterId1: myCharacter.characterId,
          characterId2: targetData.characterId,
          characterId1Win,
          characterId1Draw,
          characterId1Lose,
          characterId2Win,
          characterId2Draw,
          characterId2Lose,
        },
      });

      return res.status(200).json({
        message: `${myCharacter.name} 팀이 비겼습니다. 치열했네요!`,
        result: `${myCharacter.name} ${myGoal} - ${targetGoal} ${targetData.name}`,
        gameLog: gameLog,
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
