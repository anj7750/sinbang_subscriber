/**
 * 넥스트클라우드 WebDAV에서 "신문과방송 DM리스트" 엑셀 파일을 가져와,
 * 기존 excelMultiSheetParser.ts(parseExcelOrCsvWorkbook)가 그대로 쓸 수 있도록
 * 브라우저 File 객체로 변환해주는 모듈입니다.
 *
 * ── 설정 방법 ──────────────────────────────────────────
 * 아래 4개 값을 실제 정보로 교체하세요.
 * (사내 와이파이 전용 사이트라는 전제 하에, 별도 백엔드 프록시 없이 직접 호출합니다.)
 * ─────────────────────────────────────────────────────
 */

export interface NextcloudConfig {
  baseUrl: string;
  username: string;
  appPassword: string;
  filePath: string;
}

const DEFAULT_NEXTCLOUD_BASE_URL = 'http://192.168.130.250:8080'; // 넥스트클라우드 서버 주소
const DEFAULT_NEXTCLOUD_USERNAME = 'ryunne';
const DEFAULT_NEXTCLOUD_APP_PASSWORD = 'kpf1234kpf!!';

export function getNextcloudConfig(): NextcloudConfig {
  const saved = localStorage.getItem('nextcloud_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migrate from placeholder if needed
      const username =
        parsed.username && parsed.username !== '여기에_계정아이디'
          ? parsed.username
          : DEFAULT_NEXTCLOUD_USERNAME;
      const appPassword =
        parsed.appPassword && parsed.appPassword !== '여기에_앱비밀번호'
          ? parsed.appPassword
          : DEFAULT_NEXTCLOUD_APP_PASSWORD;

      return {
        baseUrl: parsed.baseUrl || DEFAULT_NEXTCLOUD_BASE_URL,
        username,
        appPassword,
        filePath:
          parsed.filePath && !parsed.filePath.includes('여기에_계정아이디')
            ? parsed.filePath
            : `/remote.php/dav/files/${username}/(최신) 신문과방송 DM리스트(2026년).xlsx`
      };
    } catch (e) {
      console.warn('Failed to parse saved nextcloud config:', e);
    }
  }

  const username = DEFAULT_NEXTCLOUD_USERNAME;
  return {
    baseUrl: DEFAULT_NEXTCLOUD_BASE_URL,
    username,
    appPassword: DEFAULT_NEXTCLOUD_APP_PASSWORD,
    filePath: `/remote.php/dav/files/${username}/(최신) 신문과방송 DM리스트(2026년).xlsx`
  };
}

export function saveNextcloudConfig(config: Partial<NextcloudConfig>): void {
  const current = getNextcloudConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('nextcloud_config', JSON.stringify(updated));
}

function getAuthHeader(username?: string, password?: string): string {
  const config = getNextcloudConfig();
  const u = username || config.username;
  const p = password || config.appPassword;
  const raw = `${u}:${p}`;
  return 'Basic ' + btoa(unescape(encodeURIComponent(raw)));
}

/**
 * 넥스트클라우드에서 최신 DM리스트 파일을 가져와 File 객체로 반환합니다.
 * 반환된 File은 CsvUploadModal의 parseExcelOrCsvWorkbook()에 그대로 넘길 수 있습니다.
 */
export async function fetchNextcloudDmListFile(overrideConfig?: Partial<NextcloudConfig>): Promise<File> {
  const config = { ...getNextcloudConfig(), ...overrideConfig };
  
  // Ensure filePath contains actual username if configured
  let effectiveFilePath = config.filePath;
  if (effectiveFilePath.includes('여기에_계정아이디') && config.username !== '여기에_계정아이디') {
    effectiveFilePath = effectiveFilePath.replace('여기에_계정아이디', config.username);
  }

  const url = config.baseUrl.replace(/\/+$/, '') + '/' + encodeURI(effectiveFilePath.replace(/^\/+/, ''));

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: getAuthHeader(config.username, config.appPassword) },
  });

  if (!res.ok) {
    throw new Error(
      `넥스트클라우드에서 파일을 가져오지 못했습니다. (status: ${res.status} ${res.statusText})\nURL: ${url}`
    );
  }

  const blob = await res.blob();
  const fileName = effectiveFilePath.split('/').pop() || '신문과방송_DM리스트(2026년).xlsx';

  return new File([blob], fileName, {
    type:
      blob.type ||
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
