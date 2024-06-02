import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import Joi from 'joi';

const router = express.Router();

const character1Schema = Joi.object({
  character1PlayerId: Joi.number().required(),
  cash: Joi.number().required(),
});

// 이적 신청 API
router.post('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const character1Validation = await character1Schema.validateAsync(req.body);
    const { character1PlayerId, cash } = character1Validation;

    const transfer = await prisma.playerTransfer.create({
      data: {
        characterId1: userId,
        character1PlayerId,
        character1Cash: cash,
      },
    });

    return res.status(201).json({ message: '이적 신청이 완료되었습니다.', data: transfer });
  } catch (err) {
    next(err);
  }
});

// 이적 확인 API
router.get('/transfer', authMiddleware, async (req, res, next) => {
    try {
        const {userId} = req.user;
        const requestTransfer = await prisma.playerTransfer.findMany({
            where: {
                characterId1: userId,
                status: 'continue',
            }
        })

        const getTransfer = await prisma.playerTransfer.findMany({
            where: {
                characterId2: userId,
                status: 'continue',
            }
        })

        const endTransfer = await prisma.playerTransfer.findMany({
            where: {
                OR: [
                    {characterId2: userId},
                    {characterId1: userId},
                ],
                status: {not: "continue"},
            },
            
        })

        return res.status(200).json({message: '이적 리스트입니다', requestTransfer, getTransfer, endTransfer})
    } catch(err) {
        next(err);
    }
})

// 이적 대상자의 거절/후제시 API
router.patch('/transfer/:playerTransferId', authMiddleware, async (req, res, next) => {
    try {
        const {userId} = req.user;
        const {response} = req.body;
        const {playerTransferId} = req.params;

        if (response === "refuse") {
            await prisma.playerTransfer.update({
                where: {playerTransferId: +playerTransferId},
                data: {
                    status: `${userId}_refuse`,
                }
            })
            return res.status(200).json({message: '이적을 거절했습니다'})
        }

        if (response === "success") {}





    } catch(err) {
        next(err);
    }
})






export default router;
