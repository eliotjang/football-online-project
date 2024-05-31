import dotEnv from 'dotenv';

dotEnv.config();

const configs = {
  serverPort: process.env.SERVER_PORT,
  tokenSecretKey: process.env.TOKEN_SECRET_KEY,
};

export default configs;
