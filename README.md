# Futsal Online Project

### AWS 배포 링크
- [Futsal Online Project](http://eliotjang.shop:3000)

### API 명세서
- [API 명세서 링크](https://www.notion.so/eliotjang/API-60043ac2edea43e5b43105aac4f8a4f5)

![alt text](./assets/API-image.png)

### ERD 클라우드

- [ERD 클라우드 링크](https://www.erdcloud.com/d/ePThQxtKBRe8kzFfR)

![alt text](./assets/ERD-image.png)

### 설계 및 구현

- 필수 구현 사항
    - 회원가입
        - 계정 생성 및 캐릭터 생성
    - 로그인
        - 계정 로그인
    - 캐시 구매
        - 로그인 후 구매 가능
        - 호출 시 1000캐시 획득
    - 뽑기
        - 로그인 후 뽑기 가능
        - 선수 가치에 따라 확률이 다른 뽑기 기능
        - 뽑기 1회 당 1000캐시 소모
        - 방출 패널티에 따른 추가 금액 지불
        - 뽑기 후 보유 선수 목록에 추가
    - 보유 선수 목록 조회
        - 본인 팀 조회
            - 로그인 후 조회 가능
        - 타 팀 조회
            - 비로그인 조회 가능
            - 파라미터로 해당 캐릭터 아이디 전달
    - 출전 선수 구성
        - 출전 선수 등록
            - 로그인 후 3명의 선수까지 등록 가능
            - 동일 선수 등록 불가능
            - 등록 시 보유 선수 목록에서 제거
        - 출전 선수 조회
            - 본인 팀 조회
                - 로그인 후 조회 가능
                - 출전 선수 정보 조회 가능
            - 타 팀 조회
                - 비로그인 조회 가능
                - 파라미터로 해당 캐릭터 아이디 전달
                - 출전 선수 정보 조회 가능
        - 출전 선수 제거
            - 로그인 시 제거 가능
            - 본인의 출전 선수만 제거 가능
            - 제거 후 보유 선수 목록에 추가
    - 일반 게임
        - 상대 캐릭터 지정하여 게임 진행 가능
        - 자신을 대전 상대로 지정 불가능
        - 출전 선수가 등록되지 않으면 진행 불가
        - 선수 스탯 정규화 후 팀 스탯을 정함
        - 총 경기 시간은 90분
        - 랜덤으로 골을 넣을 때까지 지난 시간을 결정
        - 팀 스탯을 기반으로 골을 넣을 팀을 정함
        - 골 넣을 선수를 해당 팀 내에서 랜덤으로 정함
        - 90분이 지나면 경기 결과 및 진행한 게임 로그 출력

- 도전 구현 사항
    - 랭크 게임
        - 랭킹 점수를 기반으로 자신과 가까운 점수를 가진 상대와 자동 매칭 게임 진행
        - 
    - 유저 랭킹 조회
    - 선수 강화
    - 강화 선수 뽑기
    - 선수 방출
    - 이적 시장
    - 선수 트레이딩
    - 데이터베이스 선수 조회











### BackEnd Skills

![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

### 폴더 구조

```markdown
node_modules/

prisma/
└── schema.prisma

src/
├── middlewares/
│ ├── auth.middleware.js
│ ├── search-auth.middleware.js
│ └── error-handling.middleware.js
├── routes/
│ ├── character-inventory.router.js
│ ├── character-items.router.js
│ ├── characters.router.js
│ ├── game-content.router.js
│ ├── items.router.js
│ └── users.router.js
├── utils/prisma
│ ├── game.client.js
│ └── user.client.js
└── app.js

.env
.gitignore
.prettierrc
package.json
README.md
yarn.lock
```
