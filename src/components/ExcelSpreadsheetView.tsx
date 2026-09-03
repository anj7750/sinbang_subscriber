import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Subscriber, SubscriberStatus } from '../types';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Copy,
  Search,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  PaintBucket,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Filter,
  RefreshCw,
  Save,
  Check,
  CheckCircle2,
  X,
  FileUp,
  Layers,
  Sparkles,
  Edit2,
  Grid,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  isRegisteredOrOverseas,
  isMultiCopies,
  isSubscriberExpiringInMonth,
  resolveSubscriberDisplayFields,
  STANDARD_EXCEL_COLUMNS,
  subscriberToStandardRow
} from '../utils/subscriberUtils';
import {
  parseSheetRows,
  getValidAndVisibleSheetNames
} from '../utils/excelMultiSheetParser';
import { batchAddSubscribers } from '../services/firebaseService';

interface ExcelSpreadsheetViewProps {
  subscribers: Subscriber[];
  onAddSubscriber?: (sub: Omit<Subscriber, 'id'>) => Promise<void>;
  onUpdateSubscriber?: (id: string, sub: Partial<Subscriber>) => Promise<void>;
  onDeleteSubscriber?: (id: string) => Promise<void>;
  onRefreshData?: () => void;
}

// Cell styling representation
interface CustomCellStyle {
  bg?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  fontFamily?: string;
}

// Preset color palette for paint bucket & text color
const COLOR_PALETTE = [
  { name: '투명/기본', hex: '' },
  { name: '노란색 (안내문/강조)', hex: '#FFF2CC' },
  { name: '연두색 (다부수)', hex: '#E2EFDA' },
  { name: '붉은색 (등기/해외)', hex: '#FCE4D6' },
  { name: '보라색 (해외발송)', hex: '#EDEDF8' },
  { name: '하늘색 (신규)', hex: '#DDEBF7' },
  { name: '주황색 (주의)', hex: '#FBE5D6' },
  { name: '연회색 (만료)', hex: '#F2F2F2' },
  { name: '진한 노랑', hex: '#FFE699' },
  { name: '진한 연두', hex: '#C6E0B4' },
  { name: '진한 빨강', hex: '#F8CBAD' },
  { name: '진한 파랑', hex: '#BDD7EE' },
];

const TEXT_COLORS = [
  { name: '기본 (검정)', hex: '#1E293B' },
  { name: '빨간색', hex: '#DC2626' },
  { name: '파란색', hex: '#2563EB' },
  { name: '초록색', hex: '#16A34A' },
  { name: '보라색', hex: '#7C3AED' },
  { name: '오렌지색', hex: '#EA580C' },
  { name: '회색', hex: '#64748B' },
];

const FONT_FAMILIES = [
  'Noto Sans KR',
  '맑은 고딕',
  'Pretendard',
  'Arial',
  '돋움',
  '바탕'
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20];

// Standard 24-column schema matching exact requested specification:
// 구분,발송정보,인원,부수,코드번호,회사명,부서,성명,직책,수신,우편번호,주소,내선번호,휴대전화,전자우편,구독시작월(현행),구독만료월,구독기간(누적),입금일_금액(누적),기타,상대처 담당자명,추가자,고객유형,구독중단사유
const EXCEL_COLUMNS = [
  { key: 'category', header: '구분', colLetter: 'A', width: 'w-24 min-w-[90px]', align: 'center' },
  { key: 'shippingInfo', header: '발송정보', colLetter: 'B', width: 'w-24 min-w-[90px]', align: 'center' },
  { key: 'persons', header: '인원', colLetter: 'C', width: 'w-16 min-w-[65px]', align: 'center' },
  { key: 'copies', header: '부수', colLetter: 'D', width: 'w-16 min-w-[65px]', align: 'center' },
  { key: 'codeNumber', header: '코드번호', colLetter: 'E', width: 'w-28 min-w-[105px]', align: 'center' },
  { key: 'company', header: '회사명', colLetter: 'F', width: 'w-48 min-w-[180px]', align: 'left' },
  { key: 'department', header: '부서', colLetter: 'G', width: 'w-32 min-w-[120px]', align: 'left' },
  { key: 'name', header: '성명', colLetter: 'H', width: 'w-28 min-w-[110px]', align: 'left' },
  { key: 'position', header: '직책', colLetter: 'I', width: 'w-24 min-w-[90px]', align: 'center' },
  { key: 'recipientInfo', header: '수신', colLetter: 'J', width: 'w-24 min-w-[90px]', align: 'center' },
  { key: 'zipCode', header: '우편번호', colLetter: 'K', width: 'w-24 min-w-[90px]', align: 'center' },
  { key: 'address', header: '주소', colLetter: 'L', width: 'w-80 min-w-[300px]', align: 'left' },
  { key: 'phone', header: '내선번호', colLetter: 'M', width: 'w-32 min-w-[120px]', align: 'center' },
  { key: 'mobile', header: '휴대전화', colLetter: 'N', width: 'w-32 min-w-[120px]', align: 'center' },
  { key: 'email', header: '전자우편', colLetter: 'O', width: 'w-44 min-w-[170px]', align: 'left' },
  { key: 'startDate', header: '구독시작월(현행)', colLetter: 'P', width: 'w-32 min-w-[120px]', align: 'center' },
  { key: 'expiryDate', header: '구독만료월', colLetter: 'Q', width: 'w-28 min-w-[105px]', align: 'center' },
  { key: 'accumulatedPeriod', header: '구독기간(누적)', colLetter: 'R', width: 'w-36 min-w-[140px]', align: 'left' },
  { key: 'paymentHistory', header: '입금일_금액(누적)', colLetter: 'S', width: 'w-48 min-w-[180px]', align: 'left' },
  { key: 'etc', header: '기타', colLetter: 'T', width: 'w-36 min-w-[140px]', align: 'left' },
  { key: 'contactPerson', header: '상대처 담당자명', colLetter: 'U', width: 'w-32 min-w-[120px]', align: 'center' },
  { key: 'addedBy', header: '추가자', colLetter: 'V', width: 'w-24 min-w-[90px]', align: 'center' },
  { key: 'customerType', header: '고객유형', colLetter: 'W', width: 'w-24 min-w-[90px]', align: 'center' },
  { key: 'cancellationReason', header: '구독중단사유', colLetter: 'X', width: 'w-36 min-w-[140px]', align: 'left' },
];

export const ExcelSpreadsheetView: React.FC<ExcelSpreadsheetViewProps> = ({
  subscribers,
  onAddSubscriber,
  onUpdateSubscriber,
  onDeleteSubscriber,
  onRefreshData,
}) => {
  // 1. Workbook Sheets State
  const [activeSheetTab, setActiveSheetTab] = useState<string>('DM리스트');
  const [customSheetTabs, setCustomSheetTabs] = useState<string[]>(['DM리스트', '구독만료', '구독중단(누적)', '전체']);
  
  // Custom user sheets data map (sheetName -> 2D row array or subscriber array)
  const [customSheetsData, setCustomSheetsData] = useState<{ [sheetName: string]: any[][] }>({});

  // 2. Formatting & Styles State (Key format: `${sheetName}_r${rowIdx}_c${colIdx}`)
  const [cellStyles, setCellStyles] = useState<{ [cellKey: string]: CustomCellStyle }>({});
  const [selectedFont, setSelectedFont] = useState<string>('Noto Sans KR');
  const [selectedFontSize, setSelectedFontSize] = useState<number>(9);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [isStrike, setIsStrike] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState<boolean>(false);

  // 3. Selection & Formula Bar
  const [selectedCell, setSelectedCell] = useState<{
    rowIdx: number;
    colIdx: number;
    colKey: string;
    colLetter: string;
    header: string;
    value: any;
    subscriberId?: string;
  } | null>(null);

  const [formulaValue, setFormulaValue] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [editInputVal, setEditInputVal] = useState<string>('');

  // 4. Search & Highlights
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<{ rowIdx: number; colIdx: number }[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);

  // 5. Layout & UI
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 6. Direct Uploaded Workbook File
  const [uploadedWorkbook, setUploadedWorkbook] = useState<{
    fileName: string;
    sheetNames: string[];
    activeSheet: string;
    sheetsData: { [sheetName: string]: any[][] };
    rawData: any[][];
  } | null>(null);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isSyncingUpload, setIsSyncingUpload] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [syncSuccessResult, setSyncSuccessResult] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Keyboard shortcuts (Ctrl+F for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearchBar(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update formula bar when selectedCell changes
  useEffect(() => {
    if (selectedCell) {
      setFormulaValue(String(selectedCell.value ?? ''));
    }
  }, [selectedCell]);

  // Compute displayed rows based on active sheet tab
  const activeSheetRows = useMemo(() => {
    if (uploadedWorkbook) {
      return uploadedWorkbook.rawData || [];
    }

    if (activeSheetTab === 'DM리스트' || activeSheetTab === 'DM 발송 리스트') {
      const dmEligible = subscribers.filter((s) => s.status !== '구독만료' && s.status !== '구독중단' && s.status !== '만료' && s.status !== '중단');
      return dmEligible.length > 0 ? dmEligible : subscribers;
    } else if (activeSheetTab === '구독만료') {
      return subscribers.filter((s) => s.status === '구독만료' || s.status === '만료');
    } else if (activeSheetTab === '구독중단(누적)' || activeSheetTab === '구독중단') {
      return subscribers.filter((s) => s.status === '구독중단' || s.status === '중단');
    } else if (activeSheetTab === '전체' || activeSheetTab === '전체 목록' || activeSheetTab === '요약') {
      return subscribers;
    } else if (customSheetsData[activeSheetTab]) {
      return customSheetsData[activeSheetTab];
    }
    return subscribers;
  }, [subscribers, activeSheetTab, uploadedWorkbook, customSheetsData]);

  // Execute Search & Find Matches
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchMatches([]);
      setCurrentMatchIdx(0);
      return;
    }

    const term = searchTerm.toLowerCase();
    const matches: { rowIdx: number; colIdx: number }[] = [];

    if (uploadedWorkbook) {
      const data = uploadedWorkbook.rawData || [];
      for (let r = 1; r < data.length; r++) {
        const row = data[r] || [];
        for (let c = 0; c < row.length; c++) {
          if (String(row[c] ?? '').toLowerCase().includes(term)) {
            matches.push({ rowIdx: r - 1, colIdx: c });
          }
        }
      }
    } else {
      (activeSheetRows as Subscriber[]).forEach((sub, rIdx) => {
        const resolved = resolveSubscriberDisplayFields(sub);
        EXCEL_COLUMNS.forEach((col, cIdx) => {
          let val = '';
          if (col.key === 'company') val = sub.company || sub.organization || resolved.company || '';
          else if (col.key === 'name') val = sub.name || resolved.name || '';
          else if (col.key === 'address') val = resolved.address || '';
          else if (col.key === 'phone') val = resolved.phone || '';
          else if (col.key === 'mobile') val = resolved.mobile || '';
          else if (col.key === 'email') val = resolved.email || '';
          else if (col.key === 'paymentHistory') val = resolved.paymentHistory || '';
          else val = String((resolved as any)[col.key] || (sub as any)[col.key] || '');

          if (val.toLowerCase().includes(term)) {
            matches.push({ rowIdx: rIdx, colIdx: cIdx });
          }
        });
      });
    }

    setSearchMatches(matches);
    setCurrentMatchIdx(0);
  }, [searchTerm, activeSheetRows, uploadedWorkbook]);

  // Navigate Search Matches
  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prev = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIdx(prev);
    const match = searchMatches[prev];
    setSelectedCell({
      rowIdx: match.rowIdx,
      colIdx: match.colIdx,
      colKey: EXCEL_COLUMNS[match.colIdx]?.key || `col_${match.colIdx}`,
      colLetter: EXCEL_COLUMNS[match.colIdx]?.colLetter || String.fromCharCode(65 + match.colIdx),
      header: EXCEL_COLUMNS[match.colIdx]?.header || `열 ${match.colIdx + 1}`,
      value: ''
    });
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const next = (currentMatchIdx + 1) % searchMatches.length;
    setCurrentMatchIdx(next);
    const match = searchMatches[next];
    setSelectedCell({
      rowIdx: match.rowIdx,
      colIdx: match.colIdx,
      colKey: EXCEL_COLUMNS[match.colIdx]?.key || `col_${match.colIdx}`,
      colLetter: EXCEL_COLUMNS[match.colIdx]?.colLetter || String.fromCharCode(65 + match.colIdx),
      header: EXCEL_COLUMNS[match.colIdx]?.header || `열 ${match.colIdx + 1}`,
      value: ''
    });
  };

  // Apply cell style (background fill, text color, bold, etc.)
  const handleApplyStyle = (styleUpdates: Partial<CustomCellStyle>) => {
    if (!selectedCell) {
      showToast('스타일을 적용할 셀을 먼저 클릭해 주세요.');
      return;
    }
    const key = `${activeSheetTab}_r${selectedCell.rowIdx}_c${selectedCell.colIdx}`;
    setCellStyles((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        ...styleUpdates
      }
    }));
    showToast('셀 서식이 적용되었습니다.');
  };

  // Handle Double-Click Inline Edit
  const handleStartEdit = (rowIdx: number, colIdx: number, initialVal: string) => {
    setEditingCell({ rowIdx, colIdx });
    setEditInputVal(initialVal);
  };

  // Commit Cell Change from Inline Editor or Formula Bar
  const handleCommitCellChange = async (newVal: string) => {
    if (!selectedCell) return;
    const { rowIdx, colKey, subscriberId } = selectedCell;

    if (subscriberId && onUpdateSubscriber) {
      try {
        await onUpdateSubscriber(subscriberId, { [colKey]: newVal });
        showToast('데이터가 즉시 수정되었습니다.');
      } catch (err) {
        console.error('Error updating subscriber:', err);
        showToast('데이터 수정 중 오류가 발생했습니다.');
      }
    } else if (uploadedWorkbook) {
      const updatedGrid = [...uploadedWorkbook.rawData];
      if (updatedGrid[rowIdx + 1]) {
        updatedGrid[rowIdx + 1] = [...updatedGrid[rowIdx + 1]];
        updatedGrid[rowIdx + 1][selectedCell.colIdx] = newVal;
        setUploadedWorkbook({
          ...uploadedWorkbook,
          rawData: updatedGrid,
          sheetsData: {
            ...uploadedWorkbook.sheetsData,
            [uploadedWorkbook.activeSheet]: updatedGrid
          }
        });
        showToast('엑셀 셀 값이 수정되었습니다.');
      }
    }

    setEditingCell(null);
    setFormulaValue(newVal);
    if (selectedCell) {
      setSelectedCell({ ...selectedCell, value: newVal });
    }
  };

  // Add New Row to Grid
  const handleAddNewRow = async () => {
    if (onAddSubscriber) {
      const newSub: Omit<Subscriber, 'id'> = {
        category: '정기구독',
        shippingInfo: '우편',
        copies: 1,
        codeNumber: '',
        company: '',
        department: '',
        name: '새 독자',
        position: '',
        recipientInfo: '',
        zipCode: '',
        address: '',
        deliveryCode: '',
        deliveryCodeSubmission: '',
        phone: '',
        mobile: '',
        email: '',
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        accumulatedPeriod: '',
        paymentHistory: '',
        status: activeSheetTab === '구독만료' ? '구독만료' : activeSheetTab === '구독중단(누적)' ? '구독중단' : '정상',
        etc: '',
        addedBy: '',
        memo: '',
        notes: '',
        isExpired: activeSheetTab === '구독만료',
        createdAt: new Date().toISOString().split('T')[0]
      };

      try {
        await onAddSubscriber(newSub);
        showToast('새 행이 추가되었습니다.');
        if (onRefreshData) onRefreshData();
      } catch (err) {
        console.error('Error adding subscriber:', err);
        showToast('행 추가 중 오류가 발생했습니다.');
      }
    } else if (uploadedWorkbook) {
      const emptyRow = new Array(uploadedWorkbook.rawData[0]?.length || 23).fill('');
      const updatedGrid = [...uploadedWorkbook.rawData, emptyRow];
      setUploadedWorkbook({
        ...uploadedWorkbook,
        rawData: updatedGrid,
        sheetsData: {
          ...uploadedWorkbook.sheetsData,
          [uploadedWorkbook.activeSheet]: updatedGrid
        }
      });
      showToast('새 엑셀 행이 추가되었습니다.');
    }
  };

  // Delete Selected Row
  const handleDeleteSelectedRow = async () => {
    if (!selectedCell) {
      showToast('삭제할 행의 셀을 먼저 선택해 주세요.');
      return;
    }

    if (selectedCell.subscriberId && onDeleteSubscriber) {
      if (window.confirm('선택한 독자 행 데이터를 삭제하시겠습니까?')) {
        try {
          await onDeleteSubscriber(selectedCell.subscriberId);
          showToast('독자 데이터가 삭제되었습니다.');
          setSelectedCell(null);
          if (onRefreshData) onRefreshData();
        } catch (err) {
          console.error('Error deleting subscriber:', err);
          showToast('삭제 중 오류가 발생했습니다.');
        }
      }
    } else if (uploadedWorkbook) {
      const updatedGrid = uploadedWorkbook.rawData.filter((_, idx) => idx !== selectedCell.rowIdx + 1);
      setUploadedWorkbook({
        ...uploadedWorkbook,
        rawData: updatedGrid,
        sheetsData: {
          ...uploadedWorkbook.sheetsData,
          [uploadedWorkbook.activeSheet]: updatedGrid
        }
      });
      setSelectedCell(null);
      showToast('선택한 엑셀 행이 삭제되었습니다.');
    }
  };

  // Add New Custom Sheet Tab
  const handleAddNewSheetTab = () => {
    const newTabName = prompt('추가할 새 엑셀 시트 탭 이름을 입력하세요:', `시트${customSheetTabs.length + 1}`);
    if (newTabName && newTabName.trim()) {
      const trimmed = newTabName.trim();
      if (!customSheetTabs.includes(trimmed)) {
        setCustomSheetTabs([...customSheetTabs, trimmed]);
        setCustomSheetsData((prev) => ({
          ...prev,
          [trimmed]: []
        }));
        setActiveSheetTab(trimmed);
        showToast(`새 시트 탭 '[${trimmed}]'이 생성되었습니다.`);
      } else {
        showToast('이미 존재하는 시트 이름입니다.');
      }
    }
  };

  // Upload User's Excel File (.xlsx, .xls, .csv) with 100% data preservation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const { validNames, sheetDataMap } = getValidAndVisibleSheetNames(wb);

        if (validNames.length === 0) {
          showToast('엑셀 파일에 표시 가능한 시트가 존재하지 않습니다.');
          return;
        }

        const sheetsData: { [sheetName: string]: any[][] } = {};
        for (const name of validNames) {
          sheetsData[name] = sheetDataMap.get(name) || [];
        }

        const firstSheet = validNames.includes('DM리스트') ? 'DM리스트' : validNames[0];

        setUploadedWorkbook({
          fileName: file.name,
          sheetNames: validNames,
          activeSheet: firstSheet,
          sheetsData,
          rawData: sheetsData[firstSheet] || []
        });
        setSelectedCell(null);

        showToast(`엑셀 파일 '${file.name}' (${validNames.length}개 시트) 100% 온전하게 로드 완료!`);
      } catch (err) {
        console.error('Error reading excel file:', err);
        showToast('엑셀 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Switch Sheet in Uploaded Workbook
  const handleSwitchUploadedSheet = (targetSheet: string) => {
    if (!uploadedWorkbook || !uploadedWorkbook.sheetsData[targetSheet]) return;
    setUploadedWorkbook({
      ...uploadedWorkbook,
      activeSheet: targetSheet,
      rawData: uploadedWorkbook.sheetsData[targetSheet] || []
    });
    setSelectedCell(null);
  };

  // Export to Real Excel .xlsx file with exact 24 standard columns
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();

    if (uploadedWorkbook) {
      for (const sName of uploadedWorkbook.sheetNames) {
        const grid = uploadedWorkbook.sheetsData[sName] || [];
        const ws = XLSX.utils.aoa_to_sheet(grid);
        XLSX.utils.book_append_sheet(wb, ws, sName);
      }
    } else {
      // 1. DM리스트 Sheet (발송 대상 정상/만료예정)
      const dmRows = subscribers.filter((s) => s.status === '정상' || s.status === '만료예정' || !s.status);
      const dmData = [
        STANDARD_EXCEL_COLUMNS,
        ...dmRows.map((s) => subscriberToStandardRow(s))
      ];
      const wsDM = XLSX.utils.aoa_to_sheet(dmData);
      XLSX.utils.book_append_sheet(wb, wsDM, 'DM리스트');

      // 2. 전체 Sheet (전체 독자 통합)
      const allData = [
        STANDARD_EXCEL_COLUMNS,
        ...subscribers.map((s) => subscriberToStandardRow(s))
      ];
      const wsAll = XLSX.utils.aoa_to_sheet(allData);
      XLSX.utils.book_append_sheet(wb, wsAll, '전체');

      // 3. 구독만료 Sheet
      const expRows = subscribers.filter((s) => s.status === '구독만료' || s.status === '만료');
      const expData = [
        STANDARD_EXCEL_COLUMNS,
        ...expRows.map((s) => subscriberToStandardRow(s))
      ];
      const wsExp = XLSX.utils.aoa_to_sheet(expData);
      XLSX.utils.book_append_sheet(wb, wsExp, '구독만료');

      // 4. 구독중단(누적) Sheet
      const stopRows = subscribers.filter((s) => s.status === '구독중단' || s.status === '중단');
      const stopData = [
        STANDARD_EXCEL_COLUMNS,
        ...stopRows.map((s) => subscriberToStandardRow(s))
      ];
      const wsStop = XLSX.utils.aoa_to_sheet(stopData);
      XLSX.utils.book_append_sheet(wb, wsStop, '구독중단(누적)');
    }

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `신문과방송_독자관리대장_${today}.xlsx`);
    showToast('엑셀(.xlsx) 파일 저장이 완료되었습니다.');
  };

  // Sync Uploaded Excel to System Database
  const handleExecuteSyncDB = async (syncAllSheets: boolean) => {
    if (!uploadedWorkbook) return;
    setIsSyncingUpload(true);
    setSyncProgress('시트 분석 및 변환 중...');

    try {
      const sheetsToProcess = syncAllSheets
        ? uploadedWorkbook.sheetNames
        : [uploadedWorkbook.activeSheet];

      const allValidRows: Omit<Subscriber, 'id'>[] = [];

      for (const sName of sheetsToProcess) {
        const grid = uploadedWorkbook.sheetsData[sName] || [];
        const parsed = parseSheetRows(sName, grid);
        allValidRows.push(...parsed.validRows);
      }

      if (allValidRows.length === 0) {
        showToast('저장할 데이터가 없습니다.');
        setIsSyncingUpload(false);
        setSyncProgress(null);
        return;
      }

      await batchAddSubscribers(allValidRows, (done, total) => {
        const percent = Math.round((done / total) * 100);
        setSyncProgress(`${done} / ${total}건 DB 저장 중 (${percent}%)`);
      });

      setSyncSuccessResult({
        sheetCount: sheetsToProcess.length,
        rowCount: allValidRows.length,
        sheetNames: sheetsToProcess,
        mode: syncAllSheets ? 'all' : 'active'
      });

      showToast(`총 ${allValidRows.length}건이 시스템 DB에 안전하게 저장되었습니다.`);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error syncing excel to DB:', err);
      showToast('DB 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSyncingUpload(false);
      setSyncProgress(null);
    }
  };

  return (
    <div
      className={`bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden flex flex-col font-sans text-slate-800 transition-all ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none border-none shadow-2xl' : 'mb-8'
      }`}
      style={{ zoom: `${zoomLevel}%` }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP EXCEL TITLEBAR & FILE ACTIONS */}
      <div className="bg-[#107C41] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center text-white shadow-inner">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white tracking-tight">
                {uploadedWorkbook ? uploadedWorkbook.fileName : `${new Date().getFullYear()}년 신문과방송 DM 발송 대장 (실시간 DB 연동)`}
              </h3>
              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-white/20 text-white border border-white/30">
                {uploadedWorkbook ? `[${uploadedWorkbook.activeSheet}] 탭` : `[${activeSheetTab}] 시트 (${activeSheetRows.length}명)`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* If uploaded workbook is active, provide quick switch back to real DB */}
          {uploadedWorkbook && (
            <button
              onClick={() => {
                setUploadedWorkbook(null);
                setActiveSheetTab('DM리스트');
                showToast('실시간 시스템 독자 대장(DB) 모드로 전환되었습니다.');
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black rounded shadow-xs transition-colors cursor-pointer"
              title="실시간 시스템 독자 대장(DB) 모드로 복귀합니다"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>실시간 DB 대장 모드</span>
            </button>
          )}

          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-[#107C41] text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
            title="사용자 보유 엑셀 파일(.xlsx, .csv)의 모든 탭을 화면에 띄웁니다"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>내 엑셀 파일 열기</span>
          </button>

          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded transition-colors cursor-pointer border border-white/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 다운로드 (.xlsx)</span>
          </button>

          {uploadedWorkbook && (
            <button
              onClick={() => {
                setSyncSuccessResult(null);
                setIsSyncModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>시스템 DB에 저장</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded transition-colors cursor-pointer"
            title={isFullScreen ? '전체화면 종료' : '전체화면으로 크게 보기'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. RICH EXCEL RIBBON & FORMATTING TOOLBAR */}
      <div className="bg-[#F3F4F6] border-b border-slate-300 p-2 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {/* Font Family Dropdown */}
          <select
            value={selectedFont}
            onChange={(e) => {
              setSelectedFont(e.target.value);
              handleApplyStyle({ fontFamily: e.target.value });
            }}
            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#107C41]"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>

          {/* Font Size Dropdown */}
          <select
            value={selectedFontSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              setSelectedFontSize(size);
              handleApplyStyle({ fontSize: size });
            }}
            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#107C41]"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Bold, Italic, Underline, Strikethrough */}
          <button
            onClick={() => {
              setIsBold(!isBold);
              handleApplyStyle({ bold: !isBold });
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${isBold ? 'bg-slate-300 font-extrabold' : 'hover:bg-slate-200'}`}
            title="굵게 (Bold)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsItalic(!isItalic);
              handleApplyStyle({ italic: !isItalic });
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${isItalic ? 'bg-slate-300 italic' : 'hover:bg-slate-200'}`}
            title="기울임 (Italic)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsUnderline(!isUnderline);
              handleApplyStyle({ underline: !isUnderline });
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${isUnderline ? 'bg-slate-300' : 'hover:bg-slate-200'}`}
            title="밑줄 (Underline)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsStrike(!isStrike);
              handleApplyStyle({ strike: !isStrike });
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${isStrike ? 'bg-slate-300' : 'hover:bg-slate-200'}`}
            title="취소선 (Strikethrough)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Fill Background Color (Paint Bucket Palette) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowTextColorPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-300"
              title="셀 배경색 채우기 (노란색, 연두색, 붉은색, 보라색 등)"
            >
              <PaintBucket className="w-3.5 h-3.5 text-[#107C41]" />
              <div className="w-3 h-3 rounded-full border border-slate-400 bg-amber-200" />
            </button>

            {showColorPicker && (
              <div className="absolute left-0 top-8 z-50 bg-white p-2.5 rounded-lg shadow-xl border border-slate-300 w-52 grid grid-cols-4 gap-1.5 animate-in fade-in">
                {COLOR_PALETTE.map((col, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleApplyStyle({ bg: col.hex });
                      setShowColorPicker(false);
                    }}
                    className="w-full h-7 rounded border border-slate-300 hover:scale-105 transition-transform flex items-center justify-center text-[9px] font-bold cursor-pointer"
                    style={{ backgroundColor: col.hex || '#FFFFFF' }}
                    title={col.name}
                  >
                    {!col.hex && 'None'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Color Picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTextColorPicker(!showTextColorPicker);
                setShowColorPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-300"
              title="글자색 변경"
            >
              <span className="font-extrabold text-xs underline decoration-rose-600 decoration-2">A</span>
            </button>

            {showTextColorPicker && (
              <div className="absolute left-0 top-8 z-50 bg-white p-2 rounded-lg shadow-xl border border-slate-300 w-44 grid grid-cols-4 gap-1.5 animate-in fade-in">
                {TEXT_COLORS.map((tc, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleApplyStyle({ color: tc.hex });
                      setShowTextColorPicker(false);
                    }}
                    className="w-full h-6 rounded border border-slate-200 flex items-center justify-center font-bold text-xs hover:scale-105 cursor-pointer"
                    style={{ color: tc.hex }}
                    title={tc.name}
                  >
                    A
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Align Left, Center, Right */}
          <button
            onClick={() => handleApplyStyle({ align: 'left' })}
            className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"
            title="왼쪽 정렬"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleApplyStyle({ align: 'center' })}
            className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"
            title="가운데 정렬"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleApplyStyle({ align: 'right' })}
            className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"
            title="오른쪽 정렬"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Row/Column Actions: Add Row, Delete Row */}
          <button
            onClick={handleAddNewRow}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs cursor-pointer transition-colors"
            title="새 행을 추가합니다"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>행 추가</span>
          </button>

          <button
            onClick={handleDeleteSelectedRow}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded cursor-pointer transition-colors"
            title="선택된 행을 삭제합니다"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>선택 행 삭제</span>
          </button>
        </div>

        {/* Right Search Input & Trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="엑셀 내 검색 (Ctrl+F)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-20 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#107C41] w-48 sm:w-60"
            />
            {searchMatches.length > 0 && (
              <div className="absolute right-2 flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                <span>{currentMatchIdx + 1}/{searchMatches.length}</span>
                <button onClick={handlePrevMatch} className="p-0.5 hover:bg-slate-200 rounded cursor-pointer">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button onClick={handleNextMatch} className="p-0.5 hover:bg-slate-200 rounded cursor-pointer">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. EXCEL FORMULA BAR & CELL ADDRESS */}
      <div className="bg-white border-b border-slate-300 px-3 py-1.5 flex items-center gap-2 text-xs font-mono">
        <div className="w-16 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-center font-bold text-slate-800 shadow-inner">
          {selectedCell ? `${selectedCell.colLetter}${selectedCell.rowIdx + 1}` : 'A1'}
        </div>
        <span className="font-serif italic font-bold text-slate-400 text-sm">fx</span>
        <input
          type="text"
          value={formulaValue}
          onChange={(e) => setFormulaValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCommitCellChange(formulaValue);
            }
          }}
          placeholder="수식 또는 셀 값을 입력한 후 Enter를 누르세요"
          className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-sans text-slate-900 focus:outline-none focus:border-[#107C41]"
        />
      </div>

      {/* 4. EXCEL SPREADSHEET GRID WITH STICKY HEADERS */}
      <div className={`overflow-auto select-text ${isFullScreen ? 'flex-1 h-full' : 'max-h-[640px] min-h-[460px]'}`}>
        <table className="w-full border-collapse border border-slate-300 text-xs font-sans text-slate-800">
          <thead>
            {/* Row 1: Excel Column Letters Header (A, B, C, D, ... W) */}
            <tr className="bg-[#E1DFDD] text-slate-700 sticky top-0 z-30 font-mono font-bold text-center border-b border-slate-300">
              <th className="w-12 min-w-[48px] py-1 px-2 bg-[#D2D0CE] border-r border-slate-300 sticky left-0 z-40">#</th>
              {uploadedWorkbook ? (
                uploadedWorkbook.rawData[0]?.map((_, colIdx) => (
                  <th key={colIdx} className="py-1 px-2 border-r border-slate-300 min-w-[120px]">
                    {String.fromCharCode(65 + (colIdx % 26))}
                  </th>
                ))
              ) : (
                EXCEL_COLUMNS.map((col) => (
                  <th key={col.colLetter} className={`py-1 px-2 border-r border-slate-300 ${col.width}`}>
                    {col.colLetter}
                  </th>
                ))
              )}
            </tr>

            {/* ONLYOFFICE Row 1: Yellow Notice Bar (A1:E1) */}
            <tr className="bg-white border-b border-slate-300">
              <th className="py-1 px-2 bg-[#E1DFDD] border-r border-slate-300 sticky left-0 z-20 text-center font-mono text-slate-600">
                1
              </th>
              <td
                colSpan={5}
                className="py-1 px-3 bg-[#FFF2CC] text-slate-900 font-bold border-r border-slate-300 whitespace-nowrap text-left"
              >
                ※ 등기 및 해외 발송의 경우 B열(발송정보 탭) 내 해당 셀에 붉은색, 보라색으로 표시
              </td>
              <td colSpan={18} className="bg-white border-r border-slate-300" />
            </tr>

            {/* ONLYOFFICE Row 2: Yellow Notice Bar (A2:D2) */}
            <tr className="bg-white border-b border-slate-300">
              <th className="py-1 px-2 bg-[#E1DFDD] border-r border-slate-300 sticky left-0 z-20 text-center font-mono text-slate-600">
                2
              </th>
              <td
                colSpan={4}
                className="py-1 px-3 bg-[#FFF2CC] text-slate-900 font-bold border-r border-slate-300 whitespace-nowrap text-left"
              >
                ※ 다부수의 경우 C열(부수 탭) 내 해당 셀에 연두색으로 표시
              </td>
              <td colSpan={19} className="bg-white border-r border-slate-300" />
            </tr>

            {/* ONLYOFFICE Row 3: 23 Column Headers */}
            <tr className="bg-[#F3F2F1] font-bold text-slate-900 sticky top-[28px] z-20 border-b-2 border-slate-400 shadow-2xs">
              <th className="py-2 px-2 bg-[#D2D0CE] border-r border-slate-300 sticky left-0 z-30 text-center font-mono text-slate-700">
                3
              </th>
              {uploadedWorkbook ? (
                uploadedWorkbook.rawData[0]?.map((headerCell, colIdx) => (
                  <th key={colIdx} className="py-2 px-3 border-r border-slate-300 text-left whitespace-nowrap">
                    {String(headerCell || `열 ${colIdx + 1}`)}
                  </th>
                ))
              ) : (
                EXCEL_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2 px-3 border-r border-slate-300 whitespace-nowrap ${
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.width}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>{col.header}</span>
                      <span className="text-[10px] text-slate-400">▾</span>
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {uploadedWorkbook ? (
              /* Render User's Direct Uploaded Raw Excel Sheet Rows */
              uploadedWorkbook.rawData.slice(1).map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-indigo-50/40 transition-colors">
                  <td className="py-1.5 px-2 bg-[#F3F2F1] text-slate-500 font-mono font-bold text-center border-r border-slate-300 sticky left-0 z-10">
                    {rowIdx + 4}
                  </td>
                  {row.map((cellVal, colIdx) => {
                    const isBCol = colIdx === 1;
                    const isCCol = colIdx === 2;
                    const isRegistered = isBCol && isRegisteredOrOverseas(String(cellVal));
                    const isMulti = isCCol && isMultiCopies(cellVal);

                    const isSelected = selectedCell?.rowIdx === rowIdx && selectedCell?.colIdx === colIdx;
                    const isMatch = searchMatches.some((m) => m.rowIdx === rowIdx && m.colIdx === colIdx);

                    let bgStyle = 'bg-white';
                    if (isRegistered) bgStyle = 'bg-[#FCE4D6] text-rose-900 font-bold';
                    else if (isMulti) bgStyle = 'bg-[#E2EFDA] text-emerald-900 font-bold';
                    if (isMatch) bgStyle = 'bg-amber-200 font-bold';

                    return (
                      <td
                        key={colIdx}
                        onClick={() => setSelectedCell({
                          rowIdx,
                          colIdx,
                          colKey: `col_${colIdx}`,
                          colLetter: String.fromCharCode(65 + (colIdx % 26)),
                          header: String(uploadedWorkbook.rawData[0]?.[colIdx] || `열 ${colIdx + 1}`),
                          value: cellVal
                        })}
                        onDoubleClick={() => handleStartEdit(rowIdx, colIdx, String(cellVal || ''))}
                        className={`py-1.5 px-3 border-r border-slate-200 whitespace-nowrap cursor-pointer ${bgStyle} ${
                          isSelected ? 'outline-2 outline-[#107C41] -outline-offset-2' : ''
                        }`}
                      >
                        {editingCell?.rowIdx === rowIdx && editingCell?.colIdx === colIdx ? (
                          <input
                            type="text"
                            autoFocus
                            value={editInputVal}
                            onChange={(e) => setEditInputVal(e.target.value)}
                            onBlur={() => handleCommitCellChange(editInputVal)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitCellChange(editInputVal);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full bg-white border border-[#107C41] px-1 text-xs focus:outline-none"
                          />
                        ) : (
                          String(cellVal || '')
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (activeSheetRows as Subscriber[]).length === 0 ? (
              <tr>
                <td colSpan={24} className="py-16 text-center text-slate-500 bg-white">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">선택하신 [{activeSheetTab}] 시트에 표시할 독자 데이터가 없습니다.</p>
                    <p className="text-xs text-slate-400">
                      하단 다른 시트 탭을 클릭하거나 상단 [행 추가] 버튼으로 새 독자를 등록할 수 있습니다.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              /* Render System Database Subscribers */
              (activeSheetRows as Subscriber[]).map((sub, rowIdx) => {
                const resolved = resolveSubscriberDisplayFields(sub);
                const isRegistered = isRegisteredOrOverseas(resolved.shippingInfo);
                const isMulti = isMultiCopies(resolved.copies);

                return (
                  <tr key={sub.id || rowIdx} className="hover:bg-indigo-50/40 transition-colors">
                    {/* Excel Row Index */}
                    <td className="py-1.5 px-2 bg-[#F3F2F1] text-slate-500 font-mono font-bold text-center border-r border-slate-300 sticky left-0 z-10">
                      {rowIdx + 4}
                    </td>

                    {/* 23 Columns rendering */}
                    {EXCEL_COLUMNS.map((col, colIdx) => {
                      let cellVal: any = '';
                      if (col.key === 'company') cellVal = sub.company || sub.organization || resolved.company || '';
                      else if (col.key === 'department') cellVal = sub.department || resolved.department || '';
                      else if (col.key === 'name') cellVal = sub.name || resolved.name || '';
                      else if (col.key === 'address') cellVal = resolved.address ? `${resolved.address}${resolved.detailAddress ? ' ' + resolved.detailAddress : ''}` : (sub.address || '');
                      else if (col.key === 'category') cellVal = resolved.category || sub.category || sub.subscriptionType || '정기구독';
                      else if (col.key === 'shippingInfo') cellVal = resolved.shippingInfo || sub.shippingInfo || '우편';
                      else if (col.key === 'copies') cellVal = resolved.copies || sub.copies || 1;
                      else if (col.key === 'codeNumber') cellVal = resolved.codeNumber || sub.codeNumber || '';
                      else if (col.key === 'position') cellVal = resolved.position || sub.position || '';
                      else if (col.key === 'recipientInfo') cellVal = resolved.recipientInfo || sub.recipientInfo || '';
                      else if (col.key === 'zipCode') cellVal = resolved.zipCode || sub.zipCode || '';
                      else if (col.key === 'deliveryCode') cellVal = resolved.deliveryCode || sub.deliveryCode || '';
                      else if (col.key === 'deliveryCodeSubmission') cellVal = resolved.deliveryCodeSubmission || sub.deliveryCodeSubmission || '';
                      else if (col.key === 'phone') cellVal = resolved.phone || sub.phone || '';
                      else if (col.key === 'mobile') cellVal = resolved.mobile || sub.mobile || '';
                      else if (col.key === 'email') cellVal = resolved.email || sub.email || '';
                      else if (col.key === 'startDate') cellVal = resolved.startDate || sub.startDate || '';
                      else if (col.key === 'expiryDate') cellVal = resolved.expiryDate || sub.expiryDate || '';
                      else if (col.key === 'accumulatedPeriod') cellVal = resolved.accumulatedPeriod || sub.accumulatedPeriod || '';
                      else if (col.key === 'paymentHistory') cellVal = resolved.paymentHistory || sub.paymentHistory || '';
                      else if (col.key === 'status') cellVal = sub.status || resolved.status || '정상';
                      else if (col.key === 'etc') cellVal = sub.etc || '';
                      else if (col.key === 'memo') cellVal = resolved.notes || sub.memo || sub.notes || '';
                      else cellVal = (resolved as any)[col.key] || (sub as any)[col.key] || '';

                      const isSelected = selectedCell?.rowIdx === rowIdx && selectedCell?.colIdx === colIdx;
                      const isMatch = searchMatches.some((m) => m.rowIdx === rowIdx && m.colIdx === colIdx);
                      const customStyle = cellStyles[`${activeSheetTab}_r${rowIdx}_c${colIdx}`];

                      let bgClass = 'bg-white text-slate-800';
                      if (col.key === 'shippingInfo' && isRegistered) {
                        bgClass = 'bg-[#FCE4D6] text-rose-900 font-bold';
                      } else if (col.key === 'copies' && isMulti) {
                        bgClass = 'bg-[#E2EFDA] text-emerald-900 font-bold';
                      }
                      if (isMatch) {
                        bgClass = 'bg-amber-200 font-bold';
                      }

                      return (
                        <td
                          key={col.key}
                          onClick={() => setSelectedCell({
                            rowIdx,
                            colIdx,
                            colKey: col.key,
                            colLetter: col.colLetter,
                            header: col.header,
                            value: cellVal,
                            subscriberId: sub.id
                          })}
                          onDoubleClick={() => handleStartEdit(rowIdx, colIdx, String(cellVal || ''))}
                          style={{
                            backgroundColor: customStyle?.bg,
                            color: customStyle?.color,
                            fontWeight: customStyle?.bold ? 'bold' : undefined,
                            fontStyle: customStyle?.italic ? 'italic' : undefined,
                            textDecoration: customStyle?.underline ? 'underline' : customStyle?.strike ? 'line-through' : undefined,
                            textAlign: customStyle?.align || (col.align as any),
                            fontSize: customStyle?.fontSize ? `${customStyle.fontSize}pt` : undefined,
                            fontFamily: customStyle?.fontFamily
                          }}
                          className={`py-1.5 px-3 border-r border-slate-200 whitespace-nowrap cursor-pointer ${bgClass} ${
                            isSelected ? 'outline-2 outline-[#107C41] -outline-offset-2' : ''
                          }`}
                        >
                          {editingCell?.rowIdx === rowIdx && editingCell?.colIdx === colIdx ? (
                            <input
                              type="text"
                              autoFocus
                              value={editInputVal}
                              onChange={(e) => setEditInputVal(e.target.value)}
                              onBlur={() => handleCommitCellChange(editInputVal)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCommitCellChange(editInputVal);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full bg-white border border-[#107C41] px-1 text-xs focus:outline-none"
                            />
                          ) : (
                            String(cellVal || '')
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
            {!uploadedWorkbook && activeSheetRows.length === 0 && (
              <tr>
                <td colSpan={24} className="py-16 text-center text-slate-500 font-medium">
                  선택한 시트 [<strong>{activeSheetTab}</strong>]에 표시할 독자 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM SHEET TABS BAR (ONLYOFFICE Screen Replica) */}
      <div className="bg-[#E6E6E6] border-t border-slate-300 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        {/* Left: Sheet Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {/* Add Sheet Tab Button (+) */}
          <button
            onClick={handleAddNewSheetTab}
            className="p-1 hover:bg-slate-300 rounded text-slate-700 font-bold transition-colors cursor-pointer mr-1"
            title="새 엑셀 시트 추가"
          >
            <Plus className="w-4 h-4" />
          </button>

          {uploadedWorkbook ? (
            uploadedWorkbook.sheetNames.map((sName) => {
              const isActive = uploadedWorkbook.activeSheet === sName;
              return (
                <button
                  key={sName}
                  onClick={() => handleSwitchUploadedSheet(sName)}
                  className={`flex items-center gap-1.5 px-3.5 py-1 font-bold text-xs rounded-t border-t border-x transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white border-slate-300 border-b-2 border-b-[#107C41] text-[#107C41] shadow-2xs font-extrabold'
                      : 'bg-[#D9D9D9] hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isActive ? 'text-[#107C41]' : 'text-slate-500'}`} />
                  <span>{sName}</span>
                </button>
              );
            })
          ) : (
            customSheetTabs.map((tabName) => {
              const isActive = activeSheetTab === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => {
                    setActiveSheetTab(tabName);
                    setSelectedCell(null);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1 font-bold text-xs rounded-t border-t border-x transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white border-slate-300 border-b-2 border-b-[#107C41] text-[#107C41] shadow-2xs font-extrabold'
                      : 'bg-[#D9D9D9] hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isActive ? 'text-[#107C41]' : 'text-slate-500'}`} />
                  <span>{tabName}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Right: Quick Zoom & Row Count Stats */}
        <div className="flex items-center gap-4 text-slate-600 font-medium text-[11px]">
          <div>
            <span>데이터 행: </span>
            <span className="font-bold font-mono text-slate-900">
              {uploadedWorkbook ? Math.max(0, uploadedWorkbook.rawData.length - 1) : activeSheetRows.length}건
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
              className="p-0.5 hover:bg-slate-300 rounded cursor-pointer"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold w-10 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
              className="p-0.5 hover:bg-slate-300 rounded cursor-pointer"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-slate-400 font-mono text-[10px]">
            Ready
          </div>
        </div>
      </div>

      {/* SYNC DB MODAL */}
      {isSyncModalOpen && uploadedWorkbook && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">엑셀 데이터 시스템 DB 반영</h4>
                  <p className="text-xs text-slate-500">{uploadedWorkbook.fileName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSyncModalOpen(false);
                  setSyncSuccessResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {syncSuccessResult ? (
              <div className="py-4 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    시스템 DB 저장이 완료되었습니다!
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    총 {syncSuccessResult.sheetCount}개 시트에서 {syncSuccessResult.rowCount.toLocaleString()}건의 독자 데이터가 시스템에 안전하게 등록되었습니다.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSyncModalOpen(false);
                    setSyncSuccessResult(null);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  확인 완료
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  현재 파일에 <strong className="text-emerald-700">{uploadedWorkbook.sheetNames.length}개 시트</strong>가 있습니다. 데이터를 시스템 DB에 저장하시겠습니까?
                </p>

                {isSyncingUpload && syncProgress && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 font-bold text-emerald-800">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{syncProgress}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => setIsSyncModalOpen(false)}
                    disabled={isSyncingUpload}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleExecuteSyncDB(true)}
                    disabled={isSyncingUpload}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>전체 시트 일괄 저장</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
