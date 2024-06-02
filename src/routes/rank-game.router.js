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
        record.characterId1Lose === true && losses++;
      }
      for (const record of gameRecord2) {
        record.characterId2Win === true && wins++;
        record.characterId2Draw === true && draws++;
        record.characterId2Lose === true && losses++;
      }

      const gameScore = 1000 + 10 * wins - 10 * losses;

      // 사용자인 경우 제외
      if (myCharacter.characterId === character.characterId) {
        myGameScore = gameScore;
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
    let scoreArr = [];
    for (let i = 0; i < userData.length; i++) {
      scoreArr.push(Math.abs(myGameScore - userData[i].gameScore));
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
    const myCharacterPlayer1 = await prisma.characterPlayer.findUnique({
      where: {
        characterPlayerId: myRoster.CharacterPlayerId1,
      },
    });
    const myCharacterPlayer2 = await prisma.characterPlayer.findUnique({
      where: {
        characterPlayerId: myRoster.CharacterPlayerId2,
      },
    });
    const myCharacterPlayer3 = await prisma.characterPlayer.findUnique({
      where: {
        characterPlayerId: myRoster.CharacterPlayerId3,
      },
    });

    const myCharacterPlayers = [myCharacterPlayer1, myCharacterPlayer2, myCharacterPlayer3];

    for (let i = 0; i < myCharacterPlayers.length; i++) {
      const playerId = myCharacterPlayers[i].playerId;
      const upgradeLevel = myCharacterPlayers[i].upgradeLevel;
      const player = await prisma.player.findUnique({
        where: {
          playerId_upgradeLevel: { playerId, upgradeLevel },
        },
      });

      myNormalizationScore +=
        player.playerSpeed * 0.1 +
        player.goalDecision * 0.25 +
        player.shootPower * 0.15 +
        player.defence * 0.3 +
        player.stamina * 0.2;
    }

    // 상대 출전 선수 스탯 정규화
    let targetNormalizationScore = 0;
    const targetCharacterPlayer1 = await prisma.characterPlayer.findUnique({
      where: {
        characterPlayerId: targetRoster.CharacterPlayerId1,
      },
    });
    const targetCharacterPlayer2 = await prisma.characterPlayer.findUnique({
      where: {
        characterPlayerId: targetRoster.CharacterPlayerId2,
      },
    });
    const targetCharacterPlayer3 = await prisma.characterPlayer.findUnique({
      where: {
        characterPlayerId: targetRoster.CharacterPlayerId3,
      },
    });

    const targetCharacterPlayers = [targetCharacterPlayer1, targetCharacterPlayer2, targetCharacterPlayer3];

    for (let i = 0; i < targetCharacterPlayers.length; i++) {
      const playerId = targetCharacterPlayers[i].playerId;
      const upgradeLevel = targetCharacterPlayers[i].upgradeLevel;
      const player = await prisma.player.findUnique({
        where: {
          playerId_upgradeLevel: { playerId, upgradeLevel },
        },
      });

      targetNormalizationScore +=
        player.playerSpeed * 0.1 +
        player.goalDecision * 0.25 +
        player.shootPower * 0.15 +
        player.defence * 0.3 +
        player.stamina * 0.2;
    }

    // 풋살 게임 로직 (랜덤 기반)
    const maxScore = myNormalizationScore + targetNormalizationScore;

    let result = '';
    let characterId1Win = false;
    let characterId1Draw = false;
    let characterId1Lose = false;
    let characterId2Win = false;
    let characterId2Draw = false;
    let characterId2Lose = false;
    const randomValue = Math.random() * maxScore;
    if (randomValue < myNormalizationScore) {
      // 높은 확률로 사용자 승리
      const myGoal = Math.floor(Math.random() * 4) + 2; // 2에서 5 사이
      const targetGoal = Math.floor(Math.random() * Math.min(3, myGoal + 1));
      if (myGoal === targetGoal) {
        result = `무승부: ${myCharacter.name} ${myGoal} - ${targetGoal} ${targetData.name}`;
        characterId1Draw = true;
        characterId2Draw = true;
      } else {
        result = {
          winner: `${myCharacter.name}`,
          loser: `${targetData.name}`,
          score: `${myCharacter.name} ${myGoal} - ${targetGoal} ${targetData.name}`,
        };
        characterId1Win = true;
        characterId2Lose = true;
      }
    } else {
      // 높은 확률로 상대 유저 승리
      const targetGoal = Math.floor(Math.random() * 4) + 2; // 2에서 5 사이
      const myGoal = Math.floor(Math.random() * Math.min(3, targetGoal + 1));
      if (targetGoal === myGoal) {
        result = `무승부: ${myCharacter.name} ${myGoal} - ${targetGoal} ${targetData.name}`;
        characterId1Draw = true;
        characterId2Draw = true;
      } else {
        result = {
          winner: `${targetData.name}`,
          loser: `${myCharacter.name}`,
          score: `${myCharacter.name} ${myGoal} - ${targetGoal} ${targetData.name}`,
        };
        characterId2Win = true;
        characterId1Lose = true;
      }
    }

    // 게임 전적 추가
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
      message: '랭크 게임 결과입니다.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
