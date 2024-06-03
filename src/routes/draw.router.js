import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

router.post('/draw', authMiddleware, async (req, res, next) => {
  // 선수 뽑기 API
  try {
    const { characterId } = req.character;

    const character = await prisma.character.findFirst({
      //캐릭터 정보 조회
      where: { characterId },
    });

    // 선수 방출횟수 확인
    let releaseCount = character.releaseCount;

    if (character.cash + releaseCount * 1000 < 1000 && releaseCount > 0) {
      // 선수 방출횟수가 있는 상태에서 캐시 보유 상태 검사
      return res.status(400).json({ Message: '선수 방출 패널티 부여로 인한 보유 캐쉬가 부족합니다.' });
    }

    if (character.cash < 1000) {
      //캐시 보유 1000원 이상인지 검사
      return res.status(400).json({ Message: '보유 캐쉬가 부족합니다.' });
    }

    const tier0 = 0.05; //티어에 따른 확률
    const tier1 = 0.1;
    const tier2 = 0.15;
    const tier3 = 0.2;
    const tier4 = 0.2;
    const tier5 = 0.3;

    let rarity = 0;

    const randomNumRarity = Math.random(); //희귀 등급 뽑기
    if (randomNumRarity < tier0) {
      rarity = 0;
    } else if (randomNumRarity < tier0 + tier1) {
      rarity = 1;
    } else if (randomNumRarity < tier0 + tier1 + tier2) {
      rarity = 2;
    } else if (randomNumRarity < tier0 + tier1 + tier2 + tier3) {
      rarity = 3;
    } else if (randomNumRarity < tier0 + tier1 + tier2 + tier3 + tier4) {
      rarity = 4;
    } else if (randomNumRarity < tier0 + tier1 + tier2 + tier3 + tier4 + tier5) {
      rarity = 5;
    }

    const playerList = await prisma.player.findMany({
      //뽑기 선수 리스트 조회
      where: {
        rarity: rarity,
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

    // 선수 방출 패널티 금액 추가
    let price = 1000;
    if (releaseCount > 0) {
      price += 1000;
    }
    console.log(releaseCount);

    const [characterCashUpdate, playerUpdate] = await prisma.$transaction(
      async (tx) => {
        const characterCashUpdate = await tx.character.update({
          //캐쉬 차감
          where: { characterId },
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
      // 선수 방출 패널티 횟수 차감
      await prisma.character.update({
        where: { characterId },
        data: {
          releaseCount: { decrement: 1 },
        },
      });

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
