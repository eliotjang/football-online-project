import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

router.post('/draw', authMiddleware, async (req, res, next) => {
  // 선수 뽑기 API
  try {
    const { userId } = req.user;

    const character = await prisma.character.findFirst({
      //캐릭터 정보 조회
      where: { UserId: userId },
    });

    // 선수 방출횟수 확인
    const releaseCount = await prisma.character.findUnique({
      where: { UserId: userId },
      select: { releaseCount: true },
    });

    if (character.cash + releaseCount * 1000 < 1000 && releaseCount > 0) {
      // 선수 방출횟수가 있는 상태에서 캐시 보유 상태 검사
      return res.status(400).json({ Message: '선수 방출 패널티 부여로 인한 보유 캐쉬가 부족합니다.' });
    }

    if (character.cash < 1000) {
      //캐시 보유 1000원 이상인지 검사
      return res.status(400).json({ Message: '보유 캐쉬가 부족합니다.' });
    }

    const playerList = await prisma.player.findMany({
      //뽑기 선수 리스트 조회
      where: {
        upgradeLevel: 0,
      },
    });

    const randomNum = Math.floor(Math.random() * playerList.length); //랜덤으로 뽑을 리스트 idex 뽑기

    const radomPlayer = playerList[randomNum]; //당첨 선수 정보

    const isExistCharacterPlayer = await prisma.characterPlayer.findFirst({
      //캐릭터 보유 선수중 뽑힌 캐릭터가 있는지
      where: {
        CharacterId: character.characterId,
        playerId: radomPlayer.playerId,
        upgradeLevel: radomPlayer.upgradeLevel,
      },
    });

    let price = 1000;
    if (releaseCount > 0) {
      price += 1000;
    }

    const [characterCashUpdate, playerUpdate] = await prisma.$transaction(
      async (tx) => {
        const characterCashUpdate = await tx.character.update({
          //캐쉬 차감
          where: { UserId: userId },
          data: {
            cash: character.cash - price,
          },
        });

        if (!isExistCharacterPlayer) {
          //없다면 보유 목록에 선수 새로 생성

          const playerUpdate = await tx.characterPlayer.create({
            data: {
              CharacterId: character.characterId,
              playerId: radomPlayer.playerId,
              upgradeLevel: radomPlayer.upgradeLevel,
              playerCount: 1,
            },
          });

          return [characterCashUpdate, playerUpdate];
        } else {
          //존재한다면 보유 목록에 선수 카운트 1 더하기

          const playerUpdate = await tx.characterPlayer.update({
            where: {
              characterPlayerId: isExistCharacterPlayer.characterPlayerId,
            },
            data: {
              playerCount: isExistCharacterPlayer.playerCount + 1,
            },
          });

          return [characterCashUpdate, playerUpdate];
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // 격리 레벨
      }
    );

    if (releaseCount > 0) {
      return res.status(200).json({
        message: '뽑은 선수 데이터입니다.',
        addMessage: '선수 방출 패널티로 뽑기에 1000원이 추가 소요되었습니다.',
        data: radomPlayer,
      });
    } else {
      return res.status(200).json({
        message: '뽑은 선수 데이터입니다.',
        data: radomPlayer,
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
