import express from 'express';
import ItemsRouter from './routes/items.router.js';
import UserRouter from './routes/user.router.js';
import config from './utils/configs.js';

const app = express();
const PORT = config.serverPort;

app.get('/', (req, res) => {
  res.send('풋살 온라인 게임입니다.');
});

app.use(express.json());
app.use('/api', [ItemsRouter, UserRouter]);

app.listen(PORT, () => {
  console.log(PORT, '포트 서버 연결 완료');
});
