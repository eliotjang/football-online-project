import express from 'express';
import AccountRouter from './routes/account.router.js';
import InfoRouter from './routes/info.router.js';
import CashRouter from '../src/routes/cash.router.js';
import RosterRouter from '../src/routes/roster.router.js';
import RankingSystemRouter from '../src/routes/ranking-system.router.js';
import DrawRouter from './routes/draw.router.js';
import GameRouter from './routes/game.router.js';
import UpgradeRouter from './routes/upgrade.router.js';
import RankGameRouter from './routes/rank-game.router.js';
import ReleaseRouter from './routes/release.router.js';
import PlayerRouter from './routes/player.router.js';
import TransferRouter from './routes/transfer.router.js';
import TradingRouter from './routes/trading.router.js';
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
app.use('/api', [
  AccountRouter,
  InfoRouter,
  CashRouter,
  RosterRouter,
  DrawRouter,
  GameRouter,
  RankingSystemRouter,
  UpgradeRouter,
  RankGameRouter,
  ReleaseRouter,
  PlayerRouter,
  TransferRouter,
  TradingRouter,
]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트 서버 연결 완료');
});
