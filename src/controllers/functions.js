export default class Futsal {
  constructor() {}

  // ###### 보유 선수 명단 선수 추가 및 해당 선수 반환
  static async addCharacterPlayer(characterPlayers, characterId, playerId, upgradeLevel, prisma) {
    let newCharacterPlayer;

    // 같은 선수 보유 여부 확인
    const characterPlayer = characterPlayers.find((characterPlayer) => {
      return characterPlayer.playerId === playerId && characterPlayer.upgradeLevel === upgradeLevel;
    });
    // 같은 선수 미보유 시 생성
    if (!characterPlayer) {
      newCharacterPlayer = await prisma.characterPlayer.create({
        data: {
          CharacterId: characterId,
          playerId,
          upgradeLevel,
          playerCount: 1,
        },
      });
      // 보유 선수 명단 객체 데이터 베이스와 동일하게 유지
      characterPlayers.push(newCharacterPlayer);
    } else {
      // 같은 선수 보유 시 playerCount + 1
      newCharacterPlayer = await prisma.characterPlayer.update({
        where: { characterPlayerId: characterPlayer.characterPlayerId },
        data: { playerCount: { increment: 1 } },
      });
      // 보유 선수 명단 객체 데이터 베이스와 동일하게 유지
      characterPlayer.playerCount++;
    }
    // 보유 선수 명단에 추가된 선수 반환
    return newCharacterPlayer;
  }

  // ###### 보유 선수 명단 선수 제거 및 해당 선수 반환
  static async removeCharacterPlayer(characterPlayers, playerId, upgradeLevel, prisma) {
    let deletedCharacterPlayer;

    // 보유 선수 확인
    const characterPlayer = characterPlayers.find((characterPlayer) => {
      return characterPlayer.playerId === playerId && characterPlayer.upgradeLevel === upgradeLevel;
    });
    // playerCount = 1인 경우 삭제
    if (characterPlayer.playerCount === 1) {
      deletedCharacterPlayer = await prisma.characterPlayer.delete({
        where: { characterPlayerId: characterPlayer.characterPlayerId },
      });
      // 보유 선수 명단 객체 데이터 베이스와 동일하게 유지
      characterPlayers.splice(characterPlayers.indexOf(characterPlayer), 1);
    } else {
      // playerCount > 1인 경우 playerCount - 1
      deletedCharacterPlayer = await prisma.characterPlayer.update({
        where: { characterPlayerId: characterPlayer.characterPlayerId },
        data: { playerCount: { decrement: 1 } },
      });
      // 보유 선수 명단 객체 데이터 베이스와 동일하게 유지
      characterPlayer.playerCount--;
    }
    // 보유 선수 명단에서 삭제된 선수 반환
    return deletedCharacterPlayer;
  }

  // ###### 출전 선수 명단 객체를 배열로 변환
  static rosterToRosterPlayers(roster) {
    if (!roster) return null;

    const {
      roster1PlayerId,
      roster1UpgradeLevel,
      roster2PlayerId,
      roster2UpgradeLevel,
      roster3PlayerId,
      roster3UpgradeLevel,
    } = roster;

    const rosterPlayers = [
      [roster1PlayerId, roster1UpgradeLevel],
      [roster2PlayerId, roster2UpgradeLevel],
      [roster3PlayerId, roster3UpgradeLevel],
    ];
    // rosterPlayers[i] = i+1 번 출전 선수의 [선수 Id, 선수 강화 단계] 배열을 반환
    return rosterPlayers;
  }

  // ###### 출전 선수 명단 생성 및 새 출전 선수 명단 반환
  static async addRoster(roster, newRosterPlayers, characterId, prisma) {
    let newRoster = null;
    // 명단 변경 이전 출전 선수가 없는 경우
    if (!roster) {
      newRoster = await prisma.roster.create({
        data: {
          CharacterId: characterId,
          roster1PlayerId: newRosterPlayers[0][0],
          roster1UpgradeLevel: newRosterPlayers[0][1],
          roster2PlayerId: newRosterPlayers[1][0],
          roster2UpgradeLevel: newRosterPlayers[1][1],
          roster3PlayerId: newRosterPlayers[2][0],
          roster3UpgradeLevel: newRosterPlayers[2][1],
        },
      });
    } else {
      // 명단 변경 이전 출전 선수가 있는 경우
      newRoster = await prisma.roster.update({
        where: { CharacterId: characterId },
        data: {
          roster1PlayerId: newRosterPlayers[0][0],
          roster1UpgradeLevel: newRosterPlayers[0][1],
          roster2PlayerId: newRosterPlayers[1][0],
          roster2UpgradeLevel: newRosterPlayers[1][1],
          roster3PlayerId: newRosterPlayers[2][0],
          roster3UpgradeLevel: newRosterPlayers[2][1],
        },
      });
    }

    // 새 출전 선수 명단 반환
    return newRoster;
  }

  // ###### 출전 선수 명단 제거 및 기존 출전 선수들 반환
  static async removeRoster(roster, characterId, prisma) {
    let preRoster = null;

    if (!roster) return preRoster;
    // 출전 선수 명단 제거
    preRoster = await prisma.roster.delete({
      where: { CharacterId: characterId },
    });

    // 기존 출전 선수 명단 반환
    return preRoster;
  }
}
