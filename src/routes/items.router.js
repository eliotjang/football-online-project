import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import Joi from 'joi';

const createItemSchema = Joi.object({
  itemCode: Joi.number().min(1).required(),
  itemName: Joi.string().min(1).required(),
  itemHealth: Joi.number(),
  itemPower: Joi.number(),
  itemPrice: Joi.number(),
});

const router = express.Router();

// 아이템 생성 API
router.post('/items', async (req, res, next) => {
  try {
    const validation = await createItemSchema.validateAsync(req.body);
    const { itemCode, itemName, itemPrice } = validation;
    let { itemHealth, itemPower } = req.body;

    const isExistItem = await prisma.items.findFirst({
      where: {
        itemCode,
      },
    });
    if (isExistItem) {
      return res.status(409).json({ errorMessage: '이미 존재하는 아이템 코드입니다.' });
    }

    const item = await prisma.items.create({
      data: {
        itemCode,
        itemName,
        itemHealth: itemHealth !== undefined ? itemHealth : 0,
        itemPower: itemPower !== undefined ? itemPower : 0,
        itemPrice,
      },
    });

    return res.status(201).json({
      message: `새로운 아이템 ${itemName}을(를) 생성했습니다.`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

// 아이템 수정 API
router.patch('/items/:itemCode', async (req, res, next) => {
  try {
    const updatedData = req.body;
    // Path parameter로 아이템 코드 전달
    const { itemCode } = req.params;

    const targetItem = await prisma.items.findFirst({
      where: {
        itemCode: +itemCode,
      },
    });
    if (!targetItem) {
      return res.status(400).json({ errorMessage: '아이템 조회에 실패했습니다.' });
    }

    await prisma.items.update({
      data: {
        ...updatedData,
      },
      where: {
        itemCode: targetItem.itemCode,
      },
    });

    const patchedItem = await prisma.items.findFirst({
      where: {
        itemCode: +itemCode,
      },
    });

    return res.status(200).json({
      message: `기존 아이템 ${targetItem.itemName}이(가) 수정되었습니다.`,
      basedData: targetItem,
      patchedData: patchedItem,
    });
  } catch (error) {
    next(error);
  }
});

// 아이템 목록 조회 API
router.get('/items', async (req, res, next) => {
  try {
    const items = await prisma.items.findMany({
      // 아이템 코드, 아이템 명, 아이템 가격 내용만 조회
      select: {
        itemCode: true,
        itemName: true,
        itemPrice: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      message: '생성된 아이템 목록입니다.',
      data: items,
    });
  } catch (error) {
    next(error);
  }
});

// 아이템 상세 조회 API
router.get('/items/:itemCode', async (req, res, next) => {
  try {
    // Path parameter로 아이템 코드 전달
    const { itemCode } = req.params;
    const item = await prisma.items.findFirst({
      where: {
        itemCode: +itemCode,
      },
      // 아이템 코드, 아이템 명, 아이템 능력, 아이템 가격 조회
      select: {
        itemCode: true,
        itemName: true,
        itemHealth: true,
        itemPower: true,
        itemPrice: true,
      },
    });

    return res.status(200).json({
      message: '아이템 상세 조회입니다.',
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
