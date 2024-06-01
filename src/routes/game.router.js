import express from "express";
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from "../utils/prisma/index.js"
import { Prisma } from "@prisma/client";

const router = express.Router();

router.post("/games/play/:characterId", authMiddleware, async (req, res, next) => { // 일반(상대지정) 풋살 게임

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

    if (!teamBCharactor) { //상대방 캐릭터 존재 여부 확인
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
        return prisma.character.findFirst({
            where: {
                playerId : element.playerId,
                upgradeLevel : element.upgradeLevel
            }
        })
    })

    const teamBPlayerInfo = teamBPlayerList.map(element => { //B팀 로스터 선수 스텟 조회
        return prisma.character.findFirst({
            where: {
                playerId : element.playerId,
                upgradeLevel : element.upgradeLevel
            }
        })
    })

    //A팀 스텟 총합 계산


    //경기 게임
    const maxTime = 90;
    const currentTime = 0;

    while (currentTime <= maxTime) {
        const addScoreTeam = Math.floor(Marh.random())
        const addTime = Math.floor(Math.random() * 90);
    }
})

export default router;