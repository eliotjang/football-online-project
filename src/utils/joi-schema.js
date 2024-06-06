import Joi from 'joi';

// 회원가입 유효성 검사
export const accountSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  name: Joi.string().required(),
});

// 로그인 유효성 검사
export const signInSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// 일반 게임 상대 아이디 유효성 검사
export const opponentCharacterIdSchema = Joi.object({
  opponentCharacterId: Joi.number().integer().required(),
});

// 이적 시장 유효성 검사
export const transferSchema = Joi.object({
  characterPlayerId: Joi.number().required(),
  offerCash: Joi.number().required(),
});

// 이적 시장 아이디 유효성 검사
export const transferMarketIdSchema = Joi.object({
  transferMarketId: Joi.number().integer().required(),
});

// 보유 선수 아이디 유효성 검사
export const characterPlayerIdSchema = Joi.object({
  characterPlayerId: Joi.number().integer().required(),
});

// 트레이딩 유효성 검사
export const tradeSchema = Joi.object({
  tradeCharacterId: Joi.number().integer().min(0).required(),
  tradeCharacterPlayerId: Joi.number().integer().min(0).required(),
  offerCash: Joi.number().integer().min(0).required(),
});

// // 강화 선수 유효성 검사
// const targetCharacterPlayerSchema = Joi.object({
//   characterPlayerId: Joi.number().integer().required(),
// });

// 강화 재료 선수 유효성 검사
export const upgradeMaterialSchema = Joi.object({
  upgradeMaterial: Joi.number().integer().required(),
});

// 출전 선수 명단 유효성 검사
export const rosterSchema = Joi.object({
  characterPlayerId1: Joi.number().integer().required(),
  characterPlayerId2: Joi.number().integer().required(),
  characterPlayerId3: Joi.number().integer().required(),
});

// 캐릭터 아이디 유효성 검사
export const characterIdSchema = Joi.object({
  characterId: Joi.number().integer().required(),
});

// 선수 강화 레벨 유효성 검사
export const upgradeLevelSchema = Joi.object({
  upgradeLevel: Joi.number().integer().min(0).max(5).required(),
});

// 선수 아이디 유효성 검사
export const playerIdSchema = Joi.object({
  playerId: Joi.number().integer().required(),
});
