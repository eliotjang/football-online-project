import express from 'express';
import authMiddleware from '../../../middlewares/auth.middleware.js';
import { prisma } from '../../../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

// 선수 뽑기 API (JWT 인증)
router.post('/character/content/draw', authMiddleware, async (req, res, next) => {
  try {
    const character = req.character;
    const drawPrice = 1000;

    // 선수 방출횟수 확인
    let releaseCount = character.releaseCount;
    const penaltyPrice = 1000;

    if (character.cash < drawPrice + penaltyPrice && releaseCount > 0) {
      // 선수 방출횟수가 있는 상태에서 캐시 보유 상태 검사
      return res.status(400).json({ Message: '선수 방출 패널티 부여로 인한 보유 캐쉬가 부족합니다.' });
    }

    if (character.cash < drawPrice) {
      //캐시 보유 1000원 이상인지 검사
      return res.status(400).json({ Message: '보유 캐쉬가 부족합니다.' });
    }

    const tier0 = 0.01; //티어에 따른 확률
    const tier1 = 0.04;
    const tier2 = 0.15;
    const tier3 = 0.2;
    const tier4 = 0.25;
    const tier5 = 0.35;

    const randomtierList = [tier0, tier1, tier2, tier3, tier4, tier5];

    const randomNumRarity = Math.random(); //희귀 등급 뽑기

    let rarity = 0;
    for (const element in randomtierList) {
      let currentrandomNum = 0;
      for (let i = 0; i <= element; i++) {
        currentrandomNum += randomtierList[i];
      }
      if (randomNumRarity < currentrandomNum) {
        rarity = +element;
        break;
      }
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
    let price = drawPrice;
    if (releaseCount > 0) {
      price += penaltyPrice;
    }

    const [characterCashUpdate, playerUpdate] = await prisma.$transaction(
      async (tx) => {
        const characterCashUpdate = await tx.character.update({
          //캐쉬 차감
          where: { characterId: character.characterId },
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
        where: { characterId: character.characterId },
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

router.post('/character/content/upgrade-draw', authMiddleware, async (req, res, next) => {
  // 고급 선수 뽑기 API
  try {
    const character = req.character;
    const { drawCount } = req.body;
    const drawPrice = 5000;

    let pitySystemStatus = false;

    //현재 천장까지 뽑은 횟수
    let currentPityCount = character.pityCount;
    // 선수 방출횟수 확인
    let releaseCount = character.releaseCount;
    const penaltyPrice = 1000;
    let decrementReleaseCount = 0;

    if (drawCount < releaseCount) {
      decrementReleaseCount = drawCount;
    } else {
      decrementReleaseCount = releaseCount;
    }

    if (character.cash < drawPrice * drawCount) {
      //캐시 보유 (5000 * 뽑기횟수)원 이상인지 검사
      return res.status(400).json({ Message: '보유 캐쉬가 부족합니다.' });
    }

    if (character.cash < drawPrice * drawCount + penaltyPrice * decrementReleaseCount && releaseCount > 0) {
      // 선수 방출횟수가 있는 상태에서 캐시 보유 상태 검사
      return res.status(400).json({ Message: '선수 방출 패널티 부여로 인한 보유 캐쉬가 부족합니다.' });
    }

    const tier0 = 0.03; //티어에 따른 확률
    const tier1 = 0.12;
    const tier2 = 0.15;
    const tier3 = 0.2;
    const tier4 = 0.25;
    const tier5 = 0.25;

    const randomtierList = [tier0, tier1, tier2, tier3, tier4, tier5];

    const upgradeLevel5 = 0.005; //강화 레벨에 따른 확률
    const upgradeLevel4 = 0.015;
    const upgradeLevel3 = 0.035;
    const upgradeLevel2 = 0.045;
    const upgradeLevel1 = 0.3;
    const upgradeLevel0 = 0.6;

    const randomUpgradeLevelList = [
      upgradeLevel0,
      upgradeLevel1,
      upgradeLevel2,
      upgradeLevel3,
      upgradeLevel4,
      upgradeLevel5,
    ];

    const radomPlayerList = [];

    for (let currentDrawCount = 0; currentDrawCount < drawCount; currentDrawCount++) {
      const randomNumRarity = Math.random(); //희귀 등급 뽑기

      let rarity = 0;
      for (const element in randomtierList) {
        let currentrandomNum = 0;
        for (let i = 0; i <= element; i++) {
          currentrandomNum += randomtierList[i];
        }
        if (randomNumRarity < currentrandomNum) {
          rarity = +element;
          break;
        }
      }

      const randomNumUpgradeLevel = Math.random(); //강화레벨 등급 뽑기

      let upgradeLevel = 0;
      for (const element in randomUpgradeLevelList) {
        let currentrandomNum = 0;
        for (let i = 0; i <= element; i++) {
          currentrandomNum += randomUpgradeLevelList[i];
        }
        if (randomNumUpgradeLevel < currentrandomNum) {
          upgradeLevel = +element;
          break;
        }
      }

      if (currentPityCount >= 9) {
        //천장을 찍었다면 true로 상태를 변환
        pitySystemStatus = true;
      }

      if (currentPityCount >= 9 || rarity == 0) {
        //천장 10에 도달했을 경우 뽑을 선수 0티어로 설정
        rarity = 0;
        currentPityCount = 0; //좋은것을 뽑앗을 경우 천장 횟수 초기화
      } else {
        currentPityCount++; //아닐경우 카운트 추가
      }

      const playerList = await prisma.player.findMany({
        //뽑기 선수 리스트 조회
        where: {
          rarity: rarity,
          upgradeLevel: upgradeLevel,
        },
      });

      const randomNum = Math.floor(Math.random() * playerList.length); //랜덤으로 뽑을 리스트 idex 뽑기

      radomPlayerList.push(playerList[randomNum]); //당첨 선수 정보
    }

    const existPlayerList = [];
    const notExistPlayerList = [];
    for (const p of radomPlayerList) {
      const isExistCharacterPlayer = await prisma.characterPlayer.findFirst({
        //캐릭터 보유 선수중 뽑힌 캐릭터가 있는지
        where: {
          CharacterId: character.characterId,
          playerId: p.playerId,
          upgradeLevel: p.upgradeLevel,
        },
      });

      if (isExistCharacterPlayer) {
        //존재 한다면 존재하는 선수 리스트 추가
        if (
          existPlayerList.some((element) => element.playerId == p.playerId && element.upgradeLevel == p.upgradeLevel)
        ) {
          //리스트에 존재한다면 카운트만추가
          const a = existPlayerList.findIndex((b) => b.playerId == p.playerId && b.upgradeLevel == p.upgradeLevel);
          existPlayerList[a].playerCount += 1;
        } else {
          existPlayerList.push({
            characterPlayerId: isExistCharacterPlayer.characterPlayerId,
            CharacterId: character.characterId,
            playerId: p.playerId,
            upgradeLevel: p.upgradeLevel,
            playerCount: 1,
          });
        }
      } else {
        // 존재하지 않는다면 존재하지 않는 선수 리스트 추가
        if (
          notExistPlayerList.some((element) => element.playerId == p.playerId && element.upgradeLevel == p.upgradeLevel)
        ) {
          //리스트에 존재한다면 카운트만추가
          const a = notExistPlayerList.findIndex((b) => b.playerId == p.playerId && b.upgradeLevel == p.upgradeLevel);
          notExistPlayerList[a].playerCount += 1;
        } else {
          notExistPlayerList.push({
            CharacterId: character.characterId,
            playerId: p.playerId,
            upgradeLevel: p.upgradeLevel,
            playerCount: 1,
          });
        }
      }
    }
    console.log(existPlayerList);

    // 선수 방출 패널티 금액 추가
    let price = drawPrice * drawCount;
    if (releaseCount > 0) {
      price += penaltyPrice * decrementReleaseCount;
    }

    const [characterCashUpdate, playerUpdate, characterUpdate] = await prisma.$transaction(
      async (tx) => {
        const characterCashUpdate = await tx.character.update({
          //캐쉬 차감
          where: { characterId: character.characterId },
          data: {
            cash: { decrement: price },
          },
        });

        const playerUpdate = await tx.characterPlayer.createMany({
          data: [...notExistPlayerList],
        });

        //존재한다면 보유 목록에 선수 카운트 1 더하기

        for (const existPlayer of existPlayerList) {
          const playerUpdate = await tx.characterPlayer.update({
            where: { characterPlayerId: existPlayer.characterPlayerId },
            data: {
              playerCount: { increment: existPlayer.playerCount },
            },
          });
        }

        const characterUpdate = await tx.character.update({
          where: { characterId: character.characterId },
          data: {
            pityCount: currentPityCount,
          },
        });

        return [characterCashUpdate, playerUpdate, characterUpdate];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // 격리 레벨
      }
    );

    if (releaseCount > 0) {
      // 선수 방출 패널티 횟수 차감, 천장 이후 뽑은 횟수 수정
      await prisma.character.update({
        where: { characterId: character.characterId },
        data: {
          releaseCount: { decrement: decrementReleaseCount },
        },
      });

      return res.status(200).json({
        message: '뽑은 선수 데이터입니다.',
        addMessage: `선수 방출 패널티로 뽑기에 ${penaltyPrice * decrementReleaseCount}원이 추가 소요되었습니다.`,
        pitySystem: pitySystemStatus,
        data: radomPlayerList,
      });
    } else {
      return res.status(200).json({
        message: '뽑은 선수 데이터입니다.',
        pitySystem: pitySystemStatus,
        data: radomPlayerList,
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
