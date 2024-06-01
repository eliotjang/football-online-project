import express from 'express';
import UserRouter from './routes/user.router.js';
import CharacterRouter from '../src/routes/character.router.js';
import CashRouter from '../src/routes/cash.router.js';
import RankingSystemRouter from '../src/routes/ranking-system.router.js';
import DrawRouter from './routes/draw.router.js';
import GameRouter from './routes/game.router.js';
import RankGameRouter from './routes/rank-game.router.js';
import errorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import config from './utils/configs.js';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = config.serverPort;

app.get('/', (req, res) => {
  res.send('풋살 온라인 게임입니다.');
});

app.use(express.json());
app.use(cookieParser());
app.use('/api', [UserRouter, CharacterRouter, CashRouter, DrawRouter, GameRouter, RankingSystemRouter, RankGameRouter]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트 서버 연결 완료');
});
