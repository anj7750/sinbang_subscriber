import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  AlertCircle,
  Check,
  RefreshCw,
  Info,
  LayoutGrid,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Subscriber, SubscriberStatus } from '../types';
import { batchAddSubscribers } from '../services/firebaseService';
import {
  parseExcelOrCsvWorkbook,
  ParsedWorkbookResult,
  ParsedSheetResult,
  CsvErrorRow
} from '../utils/excelMultiSheetParser';
import { STANDARD_EXCEL_COLUMNS } from '../utils/subscriberUtils';
import {
  fetchNextcloudDmListFile,
  getNextcloudConfig,
  saveNextcloudConfig,
  NextcloudConfig
} from '../lib/nextcloudFetch';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCategory?: string;
  initialStatus?: '정상' | '구독만료' | '구독중단' | '만료예정';
}

interface UploadSuccessResult {
  sheetCount: number;
  totalSaved: number;
  sheets: {
    sheetName: string;
    detectedStatus: string;
    count: number;
  }[];
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCategory = 'AUTO',
  initialStatus = '정상'
}) => {
  // Dropdown for batch status setting
  const [selectedStatus, setSelectedStatus] = useState<'AUTO' | '정상' | '구독만료' | '구독중단' | '만료예정'>(initialStatus || 'AUTO');
  
  // Dropdown for batch category setting
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'AUTO');

  // Multi-sheet parsed workbook result
  const [workbookResult, setWorkbookResult] = useState<ParsedWorkbookResult | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [selectedSheetIndices, setSelectedSheetIndices] = useState<number[]>([]);
  const [uploadMode, setUploadMode] = useState<'all' | 'custom'>('all');

  const [isParsing, setIsParsing] = useState(false);
  const [isFetchingNextcloud, setIsFetchingNextcloud] = useState(false);
  const [showNextcloudConfig, setShowNextcloudConfig] = useState(false);
  const [nextcloudSettings, setNextcloudSettings] = useState<NextcloudConfig>(() => getNextcloudConfig());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<UploadSuccessResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Template download helper with category variants
  const handleDownloadTemplate = (variant: 'standard' | 'regular' | 'institution' | 'library') => {
    let headers: string[] = [];
    let sampleRow: string[] = [];
    let filename = '신문과방송_구독자_일괄업로드_양식.csv';

    if (variant === 'regular') {
      filename = '정기구독자_일괄업로드_양식.csv';
      headers = ['구분', '성명', '휴대전화', '우편번호', '주소', '구독시작', '구독만료', '입금일_금액', '부수', '기타'];
      sampleRow = ['정기구독', '홍길동', '010-1234-5678', '04519', '서울특별시 중구 세종대로 124 프레스센터 12층', '2026-01-01', '2026-12-31', '2026.01.05_40,000원(홍길동)', '1', '신규구독 신청'];
    } else if (variant === 'institution') {
      filename = '기관_광고주_배송지_양식.csv';
      headers = ['구분', '회사명', '부서', '성명', '직책', '우편번호', '주소', '내선번호', '휴대전화', '전자우편', '부수', '기타'];
      sampleRow = ['관계기관', '한국언론진흥재단', '미디어진흥팀', '김철수', '팀장', '04519', '서울특별시 중구 세종대로 124 프레스센터 12층', '02-2000-7114', '010-9876-5432', 'kim@kpf.or.kr', '2', '정기간행물 기증'];
    } else if (variant === 'library') {
      filename = '도서관_학술기관_배송지_양식.csv';
      headers = ['구분', '회사명', '수신', '우편번호', '주소', '집배코드', '내선번호', '부수', '기타'];
      sampleRow = ['도서관', '국립중앙도서관', '연속간행물실', '06579', '서울특별시 서초구 반포대로 201', '3001', '02-590-0114', '5', '학술지 정기배송'];
    } else {
      headers = [...STANDARD_EXCEL_COLUMNS];
      sampleRow = [
        '정기구독', // 구분
        '우편', // 발송정보
        '1', // 인원
        '1', // 부수
        'KPF-2026-001', // 코드번호
        '한국언론진흥재단', // 회사명
        '미디어진흥팀', // 부서
        '홍길동', // 성명
        '팀장', // 직책
        '수신처', // 수신
        '04519', // 우편번호
        '서울특별시 중구 세종대로 124 프레스센터 12층', // 주소
        '02-2000-7114', // 내선번호
        '010-1234-5678', // 휴대전화
        'hong@kpf.or.kr', // 전자우편
        '2026.01(661호)', // 구독시작월(현행)
        '2026.12(672호)', // 구독만료월
        '12개월', // 구독기간(누적)
        '2026.01.05_40,000원(홍길동)', // 입금일_금액(누적)
        '신규구독 신청', // 기타
        '김담당', // 상대처 담당자명
        '관리자', // 추가자
        '개인', // 고객유형
        '' // 구독중단사유
      ];
    }

    const csvContent = '\uFEFF' + [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 파일(로컬 업로드든, 넥스트클라우드에서 가져온 것이든)을 파싱하는 공통 로직
  const processFile = async (file: File) => {
    setIsParsing(true);
    setSuccessResult(null);
    try {
      const statusOverride = selectedStatus !== 'AUTO' ? selectedStatus : undefined;
      const categoryOverride = selectedCategory !== 'AUTO' ? selectedCategory : undefined;
      const res = await parseExcelOrCsvWorkbook(file, statusOverride, categoryOverride);

      setWorkbookResult(res);
      setActiveSheetIndex(0);
      setSelectedSheetIndices(res.sheets.map((_, idx) => idx));
      setUploadMode('all');
    } catch (err: any) {
      console.error('Error parsing file:', err);
      alert('파일을 파싱하는 중 오류가 발생했습니다: ' + (err?.message || '알 수 없는 오류'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // "넥스트클라우드에서 최신 파일 가져오기" 버튼 핸들러
  const handleFetchFromNextcloud = async () => {
    setIsFetchingNextcloud(true);
    setSuccessResult(null);
    try {
      const file = await fetchNextcloudDmListFile(nextcloudSettings);
      await processFile(file);
    } catch (err: any) {
      console.error('Error fetching from Nextcloud:', err);
      alert(
        '넥스트클라우드에서 파일을 가져오는 중 오류가 발생했습니다:\n' +
          (err?.message || '알 수 없는 오류') +
          '\n\n사내망(와이파이) 접속 여부 및 계정 정보/경로 설정을 확인해 주세요.'
      );
    } finally {
      setIsFetchingNextcloud(false);
    }
  };

  const handleSaveNextcloudConfig = (updated: NextcloudConfig) => {
    setNextcloudSettings(updated);
    saveNextcloudConfig(updated);
    setShowNextcloudConfig(false);
  };

  // Toggle sheet selection
  const handleToggleSheet = (sheetIdx: number) => {
    setSelectedSheetIndices((prev) => {
      const isSelected = prev.includes(sheetIdx);
      if (isSelected) {
        if (prev.length === 1) {
          alert('최소 1개 이상의 시트를 선택해야 합니다.');
          return prev;
        }
        return prev.filter((i) => i !== sheetIdx);
      } else {
        return [...prev, sheetIdx].sort((a, b) => a - b);
      }
    });
  };

  // Select all sheets
  const handleSelectAllSheets = () => {
    if (!workbookResult) return;
    setSelectedSheetIndices(workbookResult.sheets.map((_, i) => i));
    setUploadMode('all');
  };

  // Compute active target rows based on selected sheets
  const targetSheets = workbookResult
    ? workbookResult.sheets.filter((_, idx) => selectedSheetIndices.includes(idx))
    : [];

  const targetValidRows: Omit<Subscriber, 'id'>[] = targetSheets.flatMap((s) => s.validRows);
  const targetErrorRows: CsvErrorRow[] = targetSheets.flatMap((s) => s.errorRows);
  const targetTotalRows = targetSheets.reduce((sum, s) => sum + s.totalRows, 0);

  const activeSheet: ParsedSheetResult | undefined = workbookResult?.sheets[activeSheetIndex];

  // Execute Batch Upload to Firestore
  const handleExecuteUpload = async () => {
    if (targetValidRows.length === 0) {
      alert('업로드할 유효한 구독자 데이터가 없습니다.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(`0 / ${targetValidRows.length}건 저장 중...`);

    try {
      // Map rows with override status if selected
      const finalRows = targetValidRows.map((item) => ({
        ...item,
        status: selectedStatus === 'AUTO' ? item.status : selectedStatus,
        category: selectedCategory === 'AUTO' ? item.category : selectedCategory
      }));

      await batchAddSubscribers(finalRows, (done, total) => {
        const percent = Math.round((done / total) * 100);
        setUploadProgress(`${done} / ${total}건 저장 완료 (${percent}%)`);
      });

      setUploadProgress(null);
      setIsUploading(false);

      const sheetDetails = targetSheets.map((s) => ({
        sheetName: s.sheetName,
        detectedStatus: selectedStatus === 'AUTO' ? s.detectedStatus : selectedStatus,
        count: s.validRows.length
      }));

      setSuccessResult({
        sheetCount: selectedSheetIndices.length,
        totalSaved: finalRows.length,
        sheets: sheetDetails
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to batch upload:', err);
      alert('업로드 도중 오류가 발생했습니다.');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleResetFile = () => {
    setWorkbookResult(null);
    setActiveSheetIndex(0);
    setSelectedSheetIndices([]);
    setSuccessResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-900">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">엑셀(XLSX) 및 CSV 멀티탭 일괄 업로드</h3>
              <p className="text-xs text-indigo-300">
                멀티 시트(DM리스트·구독만료·구독중단 등) 일괄 인식 및 통합 업로드 지원
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {successResult ? (
            /* STEP 4: SUCCESS & COMPLETION SCREEN */
            <div className="py-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md border border-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900">
                  엑셀 데이터 전체 저장이 완료되었습니다!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  총 <strong className="text-indigo-600 font-bold">{successResult.sheetCount}개 시트</strong>에서 <strong className="text-emerald-600 font-bold">{successResult.totalSaved.toLocaleString()}건</strong>의 독자 데이터가 시스템 DB에 안전하게 반영되었습니다.
                </p>
              </div>

              {/* Sheet summary breakdown cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
                {successResult.sheets.map((sh, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                        <span>{sh.sheetName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        적용 상태: <span className="font-bold text-slate-700">[{sh.detectedStatus}]</span>
                      </div>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {sh.count.toLocaleString()}건
                    </span>
                  </div>
                ))}
              </div>

              {/* Completion Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  다른 엑셀 파일 추가 업로드
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>완료 (독자 목록 확인)</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Global Status & Category Selection Bar */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
              <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-sm">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>업로드 데이터 분류 및 상태 설정</span>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                ✨ 멀티탭(4개 시트) 스마트 매핑
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  구독 구분 (카테고리 지정):
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border-2 border-indigo-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs text-slate-900"
                >
                  <option value="AUTO">📁 [자동] 파일 및 각 시트 내 '구분' 항목 그대로 유지</option>
                  <option value="정기구독">⭐ 정기구독 (일반 유료/지부 독자)</option>
                  <option value="기관/단체">🏛️ 기관/단체 (언론사, 정부, 지자체)</option>
                  <option value="고객CS">🎧 고객CS / CS조사분석 / CS미디어</option>
                  <option value="관계기관">🏢 관계기관 / 언론관련단체</option>
                  <option value="광고주">💼 광고주 / 마케팅/협력사</option>
                  <option value="도서관">📚 도서관 / 국·공립 및 대학도서관</option>
                  <option value="대학/연구소">🎓 대학 / 학술 연구소</option>
                  <option value="필자">✍️ 필자 / 기고가 / 언론인</option>
                  <option value="자료회원">📄 자료회원 / 연구원</option>
                  <option value="판촉">🎁 판촉 / 기증 / 이벤트</option>
                  <option value="개인">👤 개인독자</option>
                  <option value="기타">📌 기타 분류</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  '자동' 선택 시 각 시트의 기존 구분을 지능적으로 유지합니다.
                </p>
              </div>

              {/* Status Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  구독 상태 (Status) 일괄 적용:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border-2 border-indigo-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs text-slate-900"
                >
                  <option value="AUTO">🔄 [자동] 각 시트명(DM리스트/만료/중단)에 맞춰 자동 분류 (권장)</option>
                  <option value="정상">🟢 정상 (현재 발송 중인 정기구독/배송지)</option>
                  <option value="구독만료">⚪ 구독만료 (만료 리스트/알림 대상)</option>
                  <option value="구독중단">🔴 구독중단 (발송 중단/환불/반송)</option>
                  <option value="만료예정">🟡 만료예정 (이번 달 만료 예정자)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  '자동' 선택 시 시트 이름에 맞춰 정상, 만료, 중단 상태가 자동 지정됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 2: Template Download & File Upload Box */}
          {!workbookResult ? (
            <div className="space-y-4">
              {/* Category-Specific Template Downloads */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>항목별 맞춤 템플릿 다운로드</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('standard')}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>엑셀 전체 표준 양식</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('regular')}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>정기구독자 간편 양식</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('institution')}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>기관/광고주/기업 양식</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('library')}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>도서관/학술기관 양식</span>
                  </button>
                </div>
              </div>

              {/* Nextcloud Direct WebDAV Fetch Section */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                        <span>사내 넥스트클라우드(Nextcloud) 자동 동기화</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                          WebDAV 직접 연동
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        서버에서 최신 &ldquo;(최신) 신문과방송 DM리스트(2026년).xlsx&rdquo; 파일을 바로 불러옵니다.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNextcloudConfig(!showNextcloudConfig)}
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline px-2 py-1 hover:bg-emerald-100/70 rounded-lg transition-colors cursor-pointer"
                  >
                    {showNextcloudConfig ? '설정 닫기' : '서버/계정 설정'}
                  </button>
                </div>

                {/* Nextcloud Configuration Fields (Accordion) */}
                {showNextcloudConfig && (
                  <div className="p-3.5 bg-white border border-emerald-200 rounded-xl space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                      <span>넥스트클라우드 WebDAV 연결 설정</span>
                      <span className="text-[10px] text-slate-500 font-normal">사내 와이파이 / 로컬 스토리지에 안전 저장</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">서버 주소 (Base URL):</label>
                        <input
                          type="text"
                          value={nextcloudSettings.baseUrl}
                          onChange={(e) => setNextcloudSettings({ ...nextcloudSettings, baseUrl: e.target.value })}
                          placeholder="http://192.168.130.250:8080"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">계정 아이디 (Username):</label>
                        <input
                          type="text"
                          value={nextcloudSettings.username}
                          onChange={(e) => setNextcloudSettings({ ...nextcloudSettings, username: e.target.value })}
                          placeholder="아이디 입력"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">앱 비밀번호 (App Password):</label>
                        <input
                          type="password"
                          value={nextcloudSettings.appPassword}
                          onChange={(e) => setNextcloudSettings({ ...nextcloudSettings, appPassword: e.target.value })}
                          placeholder="넥스트클라우드 설정 > 보안 > 앱비밀번호"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">파일 경로 (DAV Path):</label>
                        <input
                          type="text"
                          value={nextcloudSettings.filePath}
                          onChange={(e) => setNextcloudSettings({ ...nextcloudSettings, filePath: e.target.value })}
                          placeholder="/remote.php/dav/files/아이디/(최신) 신문과방송 DM리스트(2026년).xlsx"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSaveNextcloudConfig(nextcloudSettings)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        설정 저장
                      </button>
                    </div>
                  </div>
                )}

                {/* Nextcloud Fetch Trigger Button */}
                <button
                  type="button"
                  onClick={handleFetchFromNextcloud}
                  disabled={isFetchingNextcloud || isParsing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all hover:shadow-md cursor-pointer disabled:cursor-not-allowed"
                >
                  {isFetchingNextcloud ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>넥스트클라우드에서 최신 엑셀 파일 가져오는 중...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>넥스트클라우드에서 최신 DM리스트 파일 바로 불러오기</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-4 text-slate-400 text-xs font-bold">또는 로컬 PC 엑셀 파일 직접 선택</span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-2xl p-8 text-center cursor-pointer transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv, .txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-1">
                  업로드할 엑셀(.xlsx, .xls) 또는 CSV 파일을 클릭하거나 여기로 드래그하세요
                </h4>
                <p className="text-xs text-slate-500">
                  ⭐ <strong className="text-emerald-700 font-bold">복수 시트(탭)를 포함한 엑셀 파일</strong>을 올리면 탭을 모두 자동 감지하여 일괄 업로드합니다.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md">📄 1. DM리스트</span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md">📄 2. 구독만료</span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md">📄 3. 구독중단</span>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 3: Multi-Sheet Preview & Validation Screen */
            <div className="space-y-5">
              {/* File Status Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-xl">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm">{workbookResult.fileName}</span>
                  <span className="text-xs text-indigo-300 font-semibold">
                    (총 {workbookResult.sheets.length}개 시트 감지 / 총 {targetValidRows.length}건 유효 데이터)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllSheets}
                    className="px-2.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    전체 시트 선택
                  </button>
                  <button
                    onClick={handleResetFile}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>다른 파일 선택</span>
                  </button>
                </div>
              </div>

              {/* MULTI-SHEET TABS & STATUS MAPPING CARD */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>감지된 엑셀 시트 ({workbookResult.sheets.length}개 탭) — 체크박스로 업로드 대상 선택</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    선택된 시트: <strong className="text-indigo-600 font-bold">{selectedSheetIndices.length}개</strong> / {workbookResult.sheets.length}개
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {workbookResult.sheets.map((sheet, idx) => {
                    const isChecked = selectedSheetIndices.includes(idx);
                    const isActive = activeSheetIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveSheetIndex(idx)}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative ${
                          isActive
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                            : isChecked
                            ? 'border-slate-300 bg-white hover:border-slate-400'
                            : 'border-slate-200 bg-slate-100 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label
                            className="flex items-center gap-2 cursor-pointer select-none font-bold text-xs text-slate-900"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSheet(idx)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="truncate">{sheet.sheetName}</span>
                          </label>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sheet.detectedStatus === '정상'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sheet.detectedStatus === '구독만료'
                              ? 'bg-slate-200 text-slate-700'
                              : sheet.detectedStatus === '구독중단'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sheet.detectedStatus}
                          </span>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between">
                          <span>데이터: <strong className="font-mono text-slate-900">{sheet.validRows.length}</strong>건</span>
                          {sheet.errorRows.length > 0 && (
                            <span className="text-rose-600 font-bold">오류 {sheet.errorRows.length}건</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200">
                  <div className="text-[11px] text-indigo-700 font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>선택된 시트 수</span>
                  </div>
                  <div className="text-xl font-extrabold text-indigo-950 mt-0.5">
                    {selectedSheetIndices.length}개 <span className="text-xs font-normal text-indigo-600">/ {workbookResult.sheets.length}개</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-bold">선택 시트 총 행 수</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-0.5">{targetTotalRows}건</div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>정상 업로드 대상 (100% 수용)</span>
                  </div>
                  <div className="text-xl font-extrabold text-emerald-800 mt-0.5">{targetValidRows.length}건</div>
                </div>
              </div>

              {/* CURRENT ACTIVE SHEET PREVIEW TABLE */}
              {activeSheet && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      <span>[{activeSheet.sheetName}] 시트 미리보기 ({activeSheet.validRows.length}건 중 상위 8건)</span>
                    </span>
                    <span className="text-slate-500 font-normal">
                      적용 상태: <strong className="text-indigo-600 font-bold">[{activeSheet.detectedStatus}]</strong>
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56 bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">구분</th>
                          <th className="p-2.5">회사명</th>
                          <th className="p-2.5">성명</th>
                          <th className="p-2.5">부서/직책</th>
                          <th className="p-2.5">배송지 주소</th>
                          <th className="p-2.5">부수</th>
                          <th className="p-2.5">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeSheet.validRows.slice(0, 8).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-600 font-medium">{row.category}</td>
                            <td className="p-2.5 font-bold text-slate-900">{row.company}</td>
                            <td className="p-2.5 text-slate-800">{row.name}</td>
                            <td className="p-2.5 text-slate-500">
                              {row.department || '-'} {row.position ? `(${row.position})` : ''}
                            </td>
                            <td className="p-2.5 text-slate-700 max-w-xs truncate">{row.address}</td>
                            <td className="p-2.5 font-mono font-bold text-indigo-600">{row.copies}부</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>

        {/* Footer Actions (Only shown when not in successResult state) */}
        {!successResult && (
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
            >
              취소
            </button>

            <button
              type="button"
              onClick={handleExecuteUpload}
              disabled={isUploading || targetValidRows.length === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{uploadProgress || '저장 진행 중...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {workbookResult && workbookResult.sheets.length > 1
                      ? `전체 ${selectedSheetIndices.length}개 시트 (${targetValidRows.length.toLocaleString()}건) 일괄 저장 진행 및 완료`
                      : targetValidRows.length > 0
                      ? `${targetValidRows.length.toLocaleString()}건 저장 진행 및 완료`
                      : '엑셀 파일을 선택해 주세요'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
