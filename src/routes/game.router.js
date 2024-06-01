import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

router.post("/games/play/:characterId", authMiddleware, async (req, res, next) => { // 일반(상대지정) 풋살 게임
    try {
        const { userId } = req.user;
        const { characterId } = req.params;

        const teamACharacter = prisma.character.findFirst({ //A팀 캐릭터 정보
            where: {
                UserId: userId
            }
        })

        const teamBCharacter = prisma.character.findFirst({ //B팀 캐릭터 정보
            where: {
                characterId
            }
        })

        if (!teamBCharacter) { //상대방 캐릭터 존재 여부 확인
            return res.status(400).json({ Message: "유효하지 않은 캐릭터 아이디입니다." });
        }

        const teamARoster = prisma.roster.findFirst({ //A팀 출전 명단
            where: {
                CharacterId: teamACharacter.characterId
            }
        })

        const teamBRoster = prisma.roster.findFirst({ //B팀 출전 명단
            where: {
                CharacterId: teamBCharacter.characterId
            }
        })


        const teamARosterList = [teamARoster.characterPlayerId1, teamARoster.characterPlayerId2, teamARoster.characterPlayerId3];
        const teamBRosterList = [teamBRoster.characterPlayerId1, teamBRoster.characterPlayerId2, teamBRoster.characterPlayerId3];

        const teamAPlayerList = teamARosterList.map(element => { //A팀 로스터 선수 중 보유 선수 정보
            return prisma.characterPlayer.findFirst({//A팀 조회
                where: {
                    characterPlayerId: element
                }
            })
        })

        const teamBPlayerList = teamBRosterList.map(element => { //B팀 로스터 선수 중 보유 선수 정보
            return prisma.characterPlayer.findFirst({//A팀 조회
                where: {
                    characterPlayerId: element
                }
            })
        })

        const teamAPlayerInfo = teamAPlayerList.map(element => { //A팀 로스터 선수 스텟 조회
            return prisma.player.findFirst({
                where: {
                    playerId: element.playerId,
                    upgradeLevel: element.upgradeLevel
                }
            })
        })

        const teamBPlayerInfo = teamBPlayerList.map(element => { //B팀 로스터 선수 스텟 조회
            return prisma.player.findFirst({
                where: {
                    playerId: element.playerId,
                    upgradeLevel: element.upgradeLevel
                }
            })
        })

        let teamAStat = 0;
        let teamBStat = 0;

        for (const element of teamAPlayerInfo) { //A팀 스텟 총합 계산

            teamAStat += element.playerSpeed;
            teamAStat += element.goalDecision;
            teamAStat += element.shootPower;
            teamAStat += element.defence;
            teamAStat += element.stamina;
        }

        for (const element of teamBPlayerInfo) { //A팀 스텟 총합 계산

            teamAStat += element.playerSpeed;
            teamAStat += element.goalDecision;
            teamAStat += element.shootPower;
            teamAStat += element.defence;
            teamAStat += element.stamina;
        }



        //경기 게임
        const maxStat = teamAStat + teamBStat;
        const maxTime = 90; //총 경기시간
        let currentTime = 0; //현재 경기 진행 시간
        let teamAScore = 0;
        let teamBScore = 0;

        while (currentTime <= maxTime) {
            const addScoreTeam = Math.random() * maxStat //경기가 아직 진행중이라면 골 넣을 팀 랜덤으로 정함
            currentTime += Math.floor(Math.random() * 90); //경기가 지난 시간 랜덤으로 결정

            if (addScoreTeam < maxStat) { //A팀이 이길 경우
                teamAScore += 1;
            } else { //B팀이 이길 경우
                teamBScore += 1;
            }

            console.log(teamAScore, " : ", teamBScore)
        }

        if (teamAScore > teamBScore) {

            return res.status(200).json({ Message: `유저 ${teamACharacter.name} 승리!`, result: `${teamACharacter.name} ${teamAScore} : ${teamBScore} ${teamBCharacter.name}` })

        } else if (teamAScore < teamBScore) {

            return res.status(200).json({ Message: `유저 ${teamBCharacter.name} 승리!`, result: `${teamACharacter.name} ${teamAScore} : ${teamBScore} ${teamBCharacter.name}` })

        } else if (teamAScore == teamBScore) {

            return res.status(200).json({ Message: `무승부!`, result: `${teamACharacter.name} ${teamAScore} : ${teamBScore} ${teamBCharacter.name}` })

        }

    } catch (err) {
        next(err)
    }
})

export default router;
