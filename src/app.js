import express from 'express';
import AccountRouter from './routes/account/account.router.js';
import InfoRouter from './routes/character/info.router.js';
import CashRouter from '../src/routes/character/cash.router.js';
import RosterRouter from '../src/routes/character/roster.router.js';
import DataCharacterRosterRouter from '../src/routes/data/character/roster.router.js';
import RankingSystemRouter from '../src/routes/data/ranking-system.router.js';
import DrawRouter from './routes/character/content/draw.router.js';
import GameRouter from './routes/character/content/futsal/game.router.js';
import RankGameRouter from './routes/character/content/futsal/rank-game.router.js';
import UpgradeRouter from './routes/character/players/upgrade.router.js';
import ReleaseRouter from './routes/character/players/release.router.js';
import PlayerRouter from './routes/character/players/player.router.js';
import DataPlayerRouter from './routes/data/player.router.js';
import DataCharacterPlayerRouter from './routes/data/character/player.router.js';
import TransferRouter from './routes/character/content/transfer.router.js';
import TradingRouter from './routes/character/players/trading.router.js';
import errorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import config from './utils/configs.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();
const PORT = config.serverPort;

const corsOptions = {
<<<<<<< HEAD
  origin: 'http://127.0.0.1:5500',
=======
  origin: 'http://13.209.73.219:5501',
>>>>>>> 46a8e948d050a5723e2227cf9266dcdb46932605
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/api', [
  AccountRouter,
  InfoRouter,
  CashRouter,
  RosterRouter,
  DataCharacterRosterRouter,
  RankingSystemRouter,
  DrawRouter,
  GameRouter,
  RankGameRouter,
  UpgradeRouter,
  ReleaseRouter,
  PlayerRouter,
  DataPlayerRouter,
  DataCharacterPlayerRouter,
  TransferRouter,
  TradingRouter,
]);
app.use(errorHandlingMiddleware);

app.get('/', (req, res) => {
  const { authorization: token } = req.headers;

  res.send('풋살 온라인 게임 서버 서비스입니다.');
});

app.listen(PORT, () => {
  console.log(PORT, '포트 서버 연결 완료');
});
