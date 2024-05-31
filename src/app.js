import express from 'express';
import UserRouter from './routes/user.router.js';
import errorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import config from './utils/configs.js';

const app = express();
const PORT = config.serverPort;

app.get('/', (req, res) => {
  res.send('풋살 온라인 게임입니다.');
});

app.use(express.json());
app.use('/api', [UserRouter]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트 서버 연결 완료');
});
