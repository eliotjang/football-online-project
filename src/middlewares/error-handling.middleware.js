export default function (err, req, res, next) {
  console.error(err);

  // 아이디 조합 및 비밀번호 확인 일치 여부 실패 시, 400 Bad Request 상태코드 및 에러 메시지 반환
  if (err.name === 'ValidationError') {
    return res.status(400).json({ errorMessage: '데이터 형식이 올바르지 않습니다.' });
  }

  res.status(500).json({ errorMessage: '서버 내부 에러가 발생했습니다.' });
}
