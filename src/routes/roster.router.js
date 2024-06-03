import express from 'express';
import Joi from 'joi';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

// 선수 명단 유효성 검사
const rosterSchema = Joi.object({
  roster1PlayerId: Joi.number().integer().required(),
  roster1UpgradeLevel: Joi.number().integer().required(),
  roster2PlayerId: Joi.number().integer().required(),
  roster2UpgradeLevel: Joi.number().integer().required(),
  roster3PlayerId: Joi.number().integer().required(),
  roster3UpgradeLevel: Joi.number().integer().required(),
});

// 출전 선수 명단 구성 API (JWT 인증)
router.post('/roster', authMiddleware, async (req, res, next) => {
  try {
    const validaion = await rosterSchema.validateAsync(req.body);
    const {
      roster1PlayerId,
      roster1UpgradeLevel,
      roster2PlayerId,
      roster2UpgradeLevel,
      roster3PlayerId,
      roster3UpgradeLevel,
    } = validaion;
    if (
      roster1PlayerId === roster2PlayerId ||
      roster1PlayerId === roster3PlayerId ||
      roster2PlayerId === roster3PlayerId
    ) {
      return res.status(400).json({ errorMessage: '선수 아이디가 중복되었습니다.' });
    }

    const { characterId } = req.character;
    const character = await prisma.character.findUnique({
      where: { characterId },
      include: { CharacterPlayer: true, Roster: true },
    });

    const rosterPlayers = [
      [roster1PlayerId, roster1UpgradeLevel],
      [roster2PlayerId, roster2UpgradeLevel],
      [roster3PlayerId, roster3UpgradeLevel],
    ];
    const rosterPlayerCharacterIds = [];
    for (const [rosterPlayerId, rosterUpgradeLevel] of rosterPlayers) {
      const rosterPlayer = character.CharacterPlayer.find((characterPlayer) => {
        return characterPlayer.playerId === rosterPlayerId && characterPlayer.upgradeLevel === rosterUpgradeLevel;
      });
      if (!rosterPlayer) {
        return res.status(400).json({ errorMessage: '선수 아이디가 유효하지 않습니다.' });
      }
      rosterPlayerCharacterIds.push(rosterPlayer.characterPlayerId);
    }

    // 출전 선수 명단 생성
    const roster = await prisma.$transaction(
      async (tx) => {
        // 출전 선수 캐릭터 보유 선수 명단에서 감소
        for (const rosterPlayerCharacterId of rosterPlayerCharacterIds) {
          const deletedCharacterPlayer = await tx.characterPlayer.delete({
            where: { characterPlayerId: rosterPlayerCharacterId, playerCount: 1 },
          });
          if (!deletedCharacterPlayer) {
            await tx.characterPlayer.update({
              where: { characterPlayerId: rosterPlayerCharacterId },
              data: { playerCount: { decrement: 1 } },
            });
          }
        }

        let roster;
        // 명단 변경 이전 출전 선수가 없는 경우
        if (!character.Roster) {
          roster = await tx.roster.create({
            data: {
              CharacterId: character.characterId,
              roster1PlayerId,
              roster1UpgradeLevel,
              roster2PlayerId,
              roster2UpgradeLevel,
              roster3PlayerId,
              roster3UpgradeLevel,
            },
          });
        }
        // 명단 변경 이전 출전 선수가 있는 경우
        else {
          roster = await tx.roster.update({
            where: { CharacterId: character.characterId },
            data: {
              roster1PlayerId,
              roster1UpgradeLevel,
              roster2PlayerId,
              roster2UpgradeLevel,
              roster3PlayerId,
              roster3UpgradeLevel,
            },
          });
          // 명단 변경 이전 출전 선수 캐릭터 보유 선수 명단에 추가
          const {
            roster1PlayerId: preRoster1PlayerId,
            roster1UpgradeLevel: preRoster1UpgradeLevel,
            roster2PlayerId: preRoster2PlayerId,
            roster2UpgradeLevel: preRoster2UpgradeLevel,
            roster3PlayerId: preRoster3PlayerId,
            roster3UpgradeLevel: preRoster3UpgradeLevel,
          } = character.Roster;
          const preRoster = [
            [preRoster1PlayerId, preRoster1UpgradeLevel],
            [preRoster2PlayerId, preRoster2UpgradeLevel],
            [preRoster3PlayerId, preRoster3UpgradeLevel],
          ];

          for (const [preRosterPlayerId, preRosterUpgradeLevel] of preRoster) {
            const characterPlayer = character.CharacterPlayer.find((characterPlayer) => {
              return (
                characterPlayer.playerId === preRosterPlayerId && characterPlayer.upgradeLevel === preRosterUpgradeLevel
              );
            });
            if (!characterPlayer) {
              roster = await tx.characterPlayer.create({
                data: {
                  CharacterId: character.characterId,
                  roster1PlayerId: preRoster1PlayerId,
                  roster1UpgradeLevel: preRoster1UpgradeLevel,
                  roster2PlayerId: preRoster2PlayerId,
                  roster2UpgradeLevel: preRoster2UpgradeLevel,
                  roster3PlayerId: preRoster3PlayerId,
                  roster3UpgradeLevel: preRoster3UpgradeLevel,
                },
              });
            } else {
              await tx.characterPlayer.update({
                where: { characterPlayerId: characterPlayer.characterPlayerId },
                data: { playerCount: { increment: 1 } },
              });
            }
          }
        }

        return roster;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({
      message: '출전 선수 명단입니다.',
      data: {
        roster1PlayerId: roster.roster1PlayerId,
        roster1UpgradeLevel: roster.roster1UpgradeLevel,
        roster2PlayerId: roster.roster2PlayerId,
        roster2UpgradeLevel: roster.roster2UpgradeLevel,
        roster3PlayerId: roster.roster3PlayerId,
        roster1UpgradeLevel: roster.roster1UpgradeLevel,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 출전 선수 명단 제거 API (JWT 인증)
router.delete('/roster', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const character = await prisma.character.findUnique({
      where: { characterId },
      include: { CharacterPlayer: true, Roster: true },
    });

    if (!character.Roster) {
      return res.status(404).json({ errorMessage: '출전 선수 명단이 존재하지 않습니다.' });
    }

    const {
      roster1PlayerId,
      roster1UpgradeLevel,
      roster2PlayerId,
      roster2UpgradeLevel,
      roster3PlayerId,
      roster3UpgradeLevel,
    } = character.Roster;

    const rosterPlayers = [
      [roster1PlayerId, roster1UpgradeLevel],
      [roster2PlayerId, roster2UpgradeLevel],
      [roster3PlayerId, roster3UpgradeLevel],
    ];

    await prisma.$transaction(
      async (tx) => {
        await tx.roster.delete({
          where: { CharacterId: character.characterId },
        });

        // 캐릭터 보유 선수 명단에 추가 (playerCount + 1)
        for (const [rosterPlayerId, rosterUpgradeLevel] of rosterPlayers) {
          const characterPlayer = character.CharacterPlayer.find((characterPlayer) => {
            return characterPlayer.playerId === rosterPlayerId && characterPlayer.upgradeLevel === rosterUpgradeLevel;
          });
          if (!characterPlayer) {
            await tx.characterPlayer.create({
              data: {
                CharacterId: character.characterId,
                playerId: rosterPlayerId,
                upgradeLevel: rosterUpgradeLevel,
                playerCount: 1,
              },
            });
          } else {
            await tx.characterPlayer.update({
              where: { characterPlayerId: characterPlayer.characterPlayerId },
              data: { playerCount: { increment: 1 } },
            });
          }
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(200).json({ message: '출전 선수 명단이 제거되었습니다.' });
  } catch (error) {
    next(error);
  }
});

// 출전 선수 명단 조회 API (JWT 인증)
router.get('/roster', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.character;
    const character = await prisma.character.findUnique({
      where: { characterId },
      include: { Roster: true },
    });

    if (!character.Roster) {
      return res.status(404).json({ errorMessage: '출전 선수 명단이 존재하지 않습니다.' });
    }

    const {
      roster1PlayerId,
      roster1UpgradeLevel,
      roster2PlayerId,
      roster2UpgradeLevel,
      roster3PlayerId,
      roster3UpgradeLevel,
    } = character.Roster;

    const rosterPlayers = [
      [roster1PlayerId, roster1UpgradeLevel],
      [roster2PlayerId, roster2UpgradeLevel],
      [roster3PlayerId, roster3UpgradeLevel],
    ];
    const players = [];

    for (const [rosterPlayerId, rosterUpgradeLevel] of rosterPlayers) {
      const player = await prisma.player.findUnique({
        where: { playerId_upgradeLevel: { playerId: rosterPlayerId, upgradeLevel: rosterUpgradeLevel } },
      });

      if (!player) {
        return res.status(404).json({ errorMessage: '요청한 선수를 찾을 수 없습니다.' });
      }

      players.push(player);
    }

    return res.status(200).json({ data: players });
  } catch (error) {
    next(error);
  }
});

// 출전 선수 명단 조회 API
router.get('/roster/:characterId', async (req, res, next) => {
  try {
    const { characterId } = req.params;

    const character = await prisma.character.findUnique({
      where: { characterId: +characterId },
      include: { Roster: true },
    });

    if (!character) {
      return res.status(400).json({ errorMessage: '유효하지 않은 캐릭터 아이디입니다.' });
    }

    if (!character.Roster) {
      return res.status(404).json({ errorMessage: '출전 선수 명단이 존재하지 않습니다.' });
    }

    const {
      roster1PlayerId,
      roster1UpgradeLevel,
      roster2PlayerId,
      roster2UpgradeLevel,
      roster3PlayerId,
      roster3UpgradeLevel,
    } = character.Roster;

    const rosterPlayers = [
      [roster1PlayerId, roster1UpgradeLevel],
      [roster2PlayerId, roster2UpgradeLevel],
      [roster3PlayerId, roster3UpgradeLevel],
    ];
    const players = [];

    for (const [rosterPlayerId, rosterUpgradeLevel] of rosterPlayers) {
      const player = await prisma.player.findUnique({
        where: { playerId_upgradeLevel: { playerId: rosterPlayerId, upgradeLevel: rosterUpgradeLevel } },
      });

      if (!player) {
        return res.status(404).json({ errorMessage: '요청한 선수를 찾을 수 없습니다.' });
      }

      players.push(player);
    }

    return res.status(200).json({ data: players });
  } catch (error) {
    next(error);
  }
});

export default router;
