import express from 'express';
import authMiddleware from '../../../../middlewares/auth.middleware.js';
import { prisma } from '../../../../utils/prisma/index.js';
import Joi from 'joi';

const router = express.Router();

const opponentCharacterIdSchema = Joi.object({
  characterId: Joi.number().integer().required(),
});

// 일반(상대지정) 풋살 게임 API
router.post('/character/content/futsal/game/:opponentCharacterId', authMiddleware, async (req, res, next) => {
  try {
    const { opponentCharacterId } = await opponentCharacterIdSchema.validateAsync(req.params);

    const teamACharacter = req.character;

    if (opponentCharacterId == teamACharacter.characterId) {
      return res.status(400).json({ message: '자신말고 상대를 지정해 주기 바랍니다.' });
    }

    const teamBCharacter = await prisma.character.findFirst({
      where: {
        characterId: +opponentCharacterId,
      },
    });

    if (!teamBCharacter) {
      //상대방 캐릭터 존재 여부 확인
      return res.status(400).json({ message: '유효하지 않은 캐릭터 아이디입니다.' });
    }

    const teamARoster = await prisma.roster.findFirst({
      //A,B팀 출전 명단 조회
      where: {
        CharacterId: teamACharacter.characterId,
      },
    });

    const teamBRoster = await prisma.roster.findFirst({
      where: {
        CharacterId: teamBCharacter.characterId,
      },
    });

    if (!teamARoster) {
      return res.status(400).json({ masaage: `${teamACharacter.name}팀 로스터에 등록된 선수가 없습니다.` });
    }

    if (!teamBRoster) {
      return res.status(400).json({ masaage: `${teamBCharacter.name}팀 로스터에 등록된 선수가 없습니다.` });
    }

    const teamARosterList = [
      //A,B팀 보유 선수 아이디 배열로 저장
      { rosterPlayerId: teamARoster.roster1PlayerId, rosterUpgradeLevel: teamARoster.roster1UpgradeLevel },
      { rosterPlayerId: teamARoster.roster2PlayerId, rosterUpgradeLevel: teamARoster.roster2UpgradeLevel },
      { rosterPlayerId: teamARoster.roster3PlayerId, rosterUpgradeLevel: teamARoster.roster3UpgradeLevel },
    ];

    const teamBRosterList = [
      //A,B팀 보유 선수 아이디 배열로 저장
      { rosterPlayerId: teamBRoster.roster1PlayerId, rosterUpgradeLevel: teamBRoster.roster1UpgradeLevel },
      { rosterPlayerId: teamBRoster.roster2PlayerId, rosterUpgradeLevel: teamBRoster.roster2UpgradeLevel },
      { rosterPlayerId: teamBRoster.roster3PlayerId, rosterUpgradeLevel: teamBRoster.roster3UpgradeLevel },
    ];

    const teamAPlayerInfo = [];
    const teamBPlayerInfo = [];

    for (const element of teamARosterList) {
      //A,B팀 선수 정보 배열로 저장
      teamAPlayerInfo.push(
        await prisma.player.findFirst({
          where: {
            playerId: element.rosterPlayerId,
            upgradeLevel: element.rosterUpgradeLevel,
          },
        })
      );
    }

    for (const element of teamBRosterList) {
      //A,B팀 선수 정보 배열로 저장
      teamBPlayerInfo.push(
        await prisma.player.findFirst({
          where: {
            playerId: element.rosterPlayerId,
            upgradeLevel: element.rosterUpgradeLevel,
          },
        })
      );
    }

    let teamAStat = 0;
    let teamBStat = 0;
    const speed = 0.1;
    const decision = 0.25;
    const power = 0.15;
    const defence = 0.3;
    const stamina = 0.2;

    for (const element of teamAPlayerInfo) {
      //A,B팀 스텟 총합 계산

      teamAStat += element.playerSpeed * speed;
      teamAStat += element.goalDecision * decision;
      teamAStat += element.shootPower * power;
      teamAStat += element.defence * defence;
      teamAStat += element.stamina * stamina;
    }

    for (const element of teamBPlayerInfo) {
      teamBStat += element.playerSpeed * speed;
      teamBStat += element.goalDecision * decision;
      teamBStat += element.shootPower * power;
      teamBStat += element.defence * defence;
      teamBStat += element.stamina * stamina;
    }

    //경기 게임
    const maxStat = teamAStat + teamBStat;
    const maxTime = 90; //총 경기시간
    let currentTime = 0; //현재 경기 진행 시간
    let teamAScore = 0;
    let teamBScore = 0;
    const gameLog = [];

    currentTime += Math.floor(Math.random() * 90);
    while (currentTime <= maxTime) {
      const addScoreTeam = Math.random() * maxStat; //경기가 아직 진행중이라면 골 넣을 팀 랜덤으로 정함
      const addScorePlayer = Math.floor(Math.random() * 3);

      if (addScoreTeam < teamAStat) {
        //A팀이 이길 경우
        teamAScore += 1;
        gameLog.push({
          gameTime: `${currentTime}분`,
          goalTeam: `${teamACharacter.name} 팀`,
          goalPlayer: teamAPlayerInfo[addScorePlayer].playerName,
        });
      } else {
        //B팀이 이길 경우
        teamBScore += 1;
        gameLog.push({
          gameTime: `${currentTime}분`,
          goalTeam: `${teamBCharacter.name} 팀`,
          goalPlayer: teamBPlayerInfo[addScorePlayer].playerName,
        });
      }
      currentTime += Math.floor(Math.random() * 45); //경기가 지난 시간 랜덤으로 결정
    }

    if (teamAScore > teamBScore) {
      return res.status(200).json({
        message: `유저 ${teamACharacter.name} 승리!`,
        result: `${teamACharacter.name} ${teamAScore} : ${teamBScore} ${teamBCharacter.name}`,
        gameLog: gameLog,
      });
    } else if (teamAScore < teamBScore) {
      return res.status(200).json({
        message: `유저 ${teamBCharacter.name} 승리!`,
        result: `${teamACharacter.name} ${teamAScore} : ${teamBScore} ${teamBCharacter.name}`,
        gameLog: gameLog,
      });
    } else if (teamAScore == teamBScore) {
      return res.status(200).json({
        message: `무승부!`,
        result: `${teamACharacter.name} ${teamAScore} : ${teamBScore} ${teamBCharacter.name}`,
        gameLog: gameLog,
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
