import express from 'express';
import Joi from 'joi';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import configs from '../utils/configs.js';

const router = express.Router();

// 회원가입 유효성 검사
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  name: Joi.string().required(),
});

// 회원가입 API
router.post('/sign-up', async (req, res, next) => {
  try {
    const validaion = await userSchema.validateAsync(req.body);
    const { email, password, confirmPassword, name } = validaion;

    // 이메일 중복 확인
    const isExistUser = await prisma.user.findFirst({
      where: { email },
    });
    if (isExistUser) {
      return res.status(409).json({ errorMessage: '이미 존재하는 이메일입니다.' });
    }

    // 이름 중복 확인
    const isExistCharacter = await prisma.character.findFirst({
      where: { name },
    });
    if (isExistCharacter) {
      return res.status(409).json({ errorMessage: '이미 존재하는 이름입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저, 캐릭터 생성 트랜잭션
    const [user, character] = await prisma.$transaction(
      async (tx) => {
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
          },
          select: {
            userId: true,
            email: true,
          },
        });

        const character = await prisma.character.create({
          data: {
            UserId: user.userId,
            name,
          },
          select: {
            name: true,
            cash: true,
          },
        });

        return [user, character];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({ message: '회원가입이 완료되었습니다.', userData: user, characterData: character });
  } catch (err) {
    next(err);
  }
});

// 로그인 API
router.post('/sign-in', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 유저 존재 유무 확인
    const user = await prisma.user.findFirst({
      where: { email },
    });
    if (!user) {
      return res.status(404).json({ errorMessage: '존재하지 않는 이메일입니다.' });
    }

    // 비밀번호 확인
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ errorMessage: '비밀번호가 일치하지 않습니다.' });
    }

    const token = jwt.sign(
      {
        userId: user.userId,
      },
      configs.tokenSecretKey
    );

    res.cookie('authorization', `Bearer ${token}`);
    return res.status(200).json({ message: '로그인에 성공했습니다.' });
  } catch (err) {
    next(err);
  }
});

export default router;
