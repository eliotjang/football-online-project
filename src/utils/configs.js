import dotEnv from 'dotenv';

dotEnv.config();

const configs = {
  serverPort: process.env.SERVER_PORT,
};

export default configs;
