# Danbi-Bot 룰렛 시스템 추가 - 변경사항

## 날짜
2026-02-19

## 추가된 기능

### 🎰 룰렛 시스템 모듈
채팅 메시지 기반 자동 룰렛 실행 시스템이 추가되었습니다.

**주요 특징:**
- 최대 4개의 독립적인 룰렛 설정 가능
- 각 룰렛마다 고유한 트리거 메시지 지정
- 확률 기반 랜덤 추첨 (확률 합계 100% 검증)
- 유저별 결과 자동 저장 및 히스토리 관리
- 고유닉(UID) 자동 추출 및 저장
- `!킵` 명령어로 유저가 자신의 기록 조회
- DJ의 유저별 메모 추가/삭제 기능
- 추가된 메모만 선택적으로 다운로드

## 수정된 파일

### 1. `/index.html`
**변경 내용:**
- 룰렛 시스템 모듈 카드 추가 (537-549줄)
- `updateToggles()` 함수에 `rouletteBot` 추가 (610줄)
- `openModal()` 함수에 `rouletteBot` 케이스 추가 (822-848줄)
- `switchRouletteTab()` 함수 추가 (1198-1269줄)
- 룰렛 관리 함수들 추가 (1271-1447줄):
  - `addNewRoulette()` - 새 룰렛 추가
  - `editRoulette()` - 룰렛 수정
  - `updateRouletteName()` - 룰렛 이름 업데이트
  - `updateRouletteTrigger()` - 트리거 메시지 업데이트
  - `addRouletteItem()` - 룰렛 아이템 추가
  - `editRouletteItem()` - 룰렛 아이템 수정
  - `deleteRouletteItem()` - 룰렛 아이템 삭제
  - `deleteRoulette()` - 룰렛 삭제
  - `viewUserDetails()` - 유저 상세 정보 보기
  - `addUserNote()` - 유저 메모 추가
  - `deleteUserNote()` - 유저 메모 삭제
  - `downloadUserData()` - 유저 데이터 다운로드
- `.tabbtn` 스타일 추가 (322-342줄)
- `exportBackup()` 함수에 `rouletteBot` 추가 (1211줄)
- `handleBackupImport()` 함수에 `rouletteBot` 추가 (1248줄)

### 2. `/main.js`
**변경 내용:**
- `injectModules()` 함수에 `rouletteBot.js` 스크립트 추가 (86줄)
- `restoreModuleSettings()` 함수의 `syncModuleData()`에 `rouletteBot` 케이스 추가 (133줄)
- `rouletteBot` 데이터 동기화 로직 추가 (161-162줄)
- `get-module-data` 핸들러에 `rouletteBot` 케이스 추가 (250줄)
- `save-module-data` 핸들러에 `rouletteBot` 케이스 추가 (290줄)
- `rouletteBot` 저장 시 동기화 로직 추가 (316-317줄)

### 3. `/engine/utils.js`
**변경 내용:**
- `BotUtils` 네임스페이스 추가 (245-255줄)
  - `sendMessage()` - 채팅 메시지 전송
  - `delay()` - 지연 함수
  - `getUniqueId()` - 고유 ID 추출

### 4. `/engine/modules/rouletteBot.js` (신규 파일)
**파일 생성:**
룰렛 시스템의 핵심 로직을 담당하는 모듈 파일입니다.

**주요 함수:**
- `spinRoulette()` - 확률 기반 룰렛 실행
- `getOrCreateUser()` - 유저 정보 가져오기 또는 생성
- `saveResult()` - 룰렛 결과 저장
- `saveData()` - 데이터 저장
- `handleChat()` - 채팅 메시지 처리 (content.js에서 호출)
- `handleMessage()` - 트리거 메시지 감지 및 룰렛 실행
- `handleKeepCommand()` - !킵 명령어 처리

**데이터 구조:**
```javascript
{
  roulettes: [
    {
      id: number,
      name: string,
      triggerMessage: string,
      items: [
        { name: string, probability: number }
      ],
      enabled: boolean
    }
  ],
  users: {
    "uid": {
      uid: string,
      nickname: string,
      history: [
        {
          timestamp: string,
          rouletteName: string,
          result: string,
          triggerMessage: string
        }
      ],
      customNotes: [string]
    }
  }
}
```

## 추가된 문서

### 1. `/ROULETTE_README.md`
룰렛 시스템 사용 가이드 문서입니다. 사용 방법, 설정 예시, 주의사항 등이 포함되어 있습니다.

### 2. `/CHANGELOG.md` (본 문서)
변경사항을 상세히 기록한 문서입니다.

## 데이터 저장

**저장 키:**
- `rouletteData` - 룰렛 설정 및 유저 데이터

**저장 위치:**
- Electron Store (자동 저장)
- 백업 파일에 포함됨

## 호환성
- 기존 Danbi-Bot 기능과 완전히 호환됩니다
- 기존 설정 및 데이터에 영향을 주지 않습니다
- 백업/복원 기능에 자동으로 포함됩니다

## 테스트 권장사항
1. 룰렛 생성 및 아이템 추가 테스트
2. 확률 합계 100% 검증 테스트
3. 트리거 메시지 감지 테스트
4. 룰렛 실행 및 결과 출력 테스트
5. !킵 명령어 테스트
6. 유저 메모 추가/삭제 테스트
7. 데이터 다운로드 테스트
8. 백업/복원 테스트

## 알려진 제한사항
- 최대 4개의 룰렛만 등록 가능
- 트리거 메시지는 정확히 일치해야 작동 (대소문자 구분)
- 고유닉 추출 실패 시 닉네임을 UID로 사용
