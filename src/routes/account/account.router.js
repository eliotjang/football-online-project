import express from 'express';
import Joi from 'joi';
import { prisma } from '../../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import configs from '../../utils/configs.js';

const router = express.Router();

// 회원가입 유효성 검사
const accountSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  name: Joi.string().required(),
});

// 회원가입 API
router.post('/account/sign-up', async (req, res, next) => {
  try {
    const validaion = await accountSchema.validateAsync(req.body);
    const { email, password, confirmPassword, name } = validaion;

    // 이메일 중복 확인 테스트
    const isExistAccount = await prisma.account.findFirst({
      where: { email },
    });
    if (isExistAccount) {
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

    // 계정, 캐릭터 생성 트랜잭션
    const [account, character] = await prisma.$transaction(
      async (tx) => {
        const account = await tx.account.create({
          data: {
            email,
            password: hashedPassword,
          },
          select: {
            accountId: true,
            email: true,
          },
        });

        const character = await tx.character.create({
          data: {
            AccountId: account.accountId,
            name,
          },
          select: {
            name: true,
            cash: true,
          },
        });

        return [account, character];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res
      .status(201)
      .json({ message: '회원가입이 완료되었습니다.', accountData: account, characterData: character });
  } catch (err) {
    next(err);
  }
});

// 로그인 유효성 검사
const signInSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// 로그인 API
router.post('/account/sign-in', async (req, res, next) => {
  try {
    const validaion = await signInSchema.validateAsync(req.body);
    const { email, password } = validaion;

    // 유저 존재 유무 확인
    const account = await prisma.account.findFirst({
      where: { email },
    });
    if (!account) {
      return res.status(404).json({ errorMessage: '존재하지 않는 이메일입니다.' });
    }

    // 비밀번호 확인
    if (!(await bcrypt.compare(password, account.password))) {
      return res.status(401).json({ errorMessage: '비밀번호가 일치하지 않습니다.' });
    }

    const token = jwt.sign(
      {
        accountId: account.accountId,
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
