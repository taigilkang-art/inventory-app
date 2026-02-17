// Google Sheets 설정
const CONFIG = {
    // Google Sheets 공개 URL의 스프레드시트 ID를 여기에 입력하세요
    // 예: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
    SPREADSHEET_ID: '1g2NKmR1y2Agt9egulBKZrGMy7WJjiTQw7Qu-Uv0Wmn8',
    
    // API 키를 여기에 입력하세요 (Google Cloud Console에서 생성)
    API_KEY: 'AIzaSyBWo8l0ERH6ESmUxYQPhizZpDIwzrBSpSs',
    
    // 시트 이름 (기본값: Sheet1)
    SHEET_NAME: 'sheet1',
    
    // 기준일 표시용 시트 (sheet2)
    INFO_SHEET_NAME: 'sheet2',
    
    // 컬럼 매핑 (A=0, B=1, C=2, ...)
    // 상품번/품목번/사이즈/품목명/단위/색상명/할당구분/당년입고/당년출고/가능재고/할당재고/영업재고/...
    COLUMNS: {
        PART_NUMBER: 1,      // B열: 품목번
        ITEM_NAME: 3,        // D열: 품목명
        COLOR: 5,            // F열: 색상명
        SIZE: 2,             // C열: 사이즈
        AVAILABLE_STOCK: 9,  // J열: 가능재고
        ALLOCATED_STOCK: 10  // K열: 할당재고
    }
};

// DOM 요소
const elements = {
    partNumberInput: document.getElementById('partNumber'),
    searchBtn: document.getElementById('searchBtn'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    result: document.getElementById('result'),
    resultCount: document.getElementById('resultCount'),
    resultPartNumber: document.getElementById('resultPartNumber'),
    resultItemName: document.getElementById('resultItemName'),
    colorList: document.getElementById('colorList')
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.partNumberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 설정 확인
    if (CONFIG.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID' || CONFIG.API_KEY === 'YOUR_API_KEY') {
        showError('Google Sheets 설정이 필요합니다. js/app.js 파일에서 SPREADSHEET_ID와 API_KEY를 설정해주세요.');
    }
    
    // sheet2의 A1 셀 데이터를 가져와서 placeholder에 표시
    loadPlaceholderText();
});

// sheet2의 A1 셀 데이터를 가져오는 함수
async function loadPlaceholderText() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.INFO_SHEET_NAME}!A1?key=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.log('sheet2 A1 셀 데이터를 가져올 수 없습니다.');
            return;
        }
        
        const data = await response.json();
        
        if (data.values && data.values.length > 0 && data.values[0].length > 0) {
            const cellValue = data.values[0][0];
            elements.partNumberInput.placeholder = `품번을 입력하세요(${cellValue})`;
        }
    } catch (error) {
        console.log('sheet2 A1 셀 데이터 로드 실패:', error);
        // 에러가 발생해도 기본 placeholder 유지
    }
}

// 검색 처리
async function handleSearch() {
    const partNumber = elements.partNumberInput.value.trim();
    
    if (!partNumber) {
        showError('품번을 입력해주세요.');
        return;
    }

    hideAll();
    showLoading();

    try {
        const dataList = await fetchInventoryData(partNumber);
        
        if (dataList && dataList.length > 0) {
            displayResult(dataList);
        } else {
            showError(`품번 "${partNumber}"을(를) 찾을 수 없습니다.`);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('데이터를 조회하는 중 오류가 발생했습니다. 네트워크 연결 및 설정을 확인해주세요.');
    } finally {
        hideLoading();
    }
}

// Google Sheets에서 데이터 가져오기
async function fetchInventoryData(partNumber) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEET_NAME}?key=${CONFIG.API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const jsonData = await response.json();
    const rows = jsonData.values;
    
    if (!rows || rows.length === 0) {
        return null;
    }

    const results = [];
    
    // 헤더 제외하고 검색 (1부터 시작)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const currentPartNumber = row[CONFIG.COLUMNS.PART_NUMBER];
        
        // 품번이 일치하는 모든 행을 수집
        if (currentPartNumber && currentPartNumber.toString().trim().toLowerCase() === partNumber.toLowerCase()) {
            results.push({
                partNumber: currentPartNumber,
                itemName: row[CONFIG.COLUMNS.ITEM_NAME] || '-',
                color: row[CONFIG.COLUMNS.COLOR] || '-',
                size: row[CONFIG.COLUMNS.SIZE] || '-',
                availableStock: row[CONFIG.COLUMNS.AVAILABLE_STOCK] || '0',
                allocatedStock: row[CONFIG.COLUMNS.ALLOCATED_STOCK] || '0'
            });
        }
    }
    
    return results.length > 0 ? results : null;
}

// 결과 표시
function displayResult(dataList) {
    const firstItem = dataList[0];
    
    elements.resultPartNumber.textContent = firstItem.partNumber;
    elements.resultItemName.textContent = firstItem.itemName;
    
    // 색상별로 그룹핑
    const colorGroups = {};
    dataList.forEach(item => {
        if (!colorGroups[item.color]) {
            colorGroups[item.color] = [];
        }
        colorGroups[item.color].push(item);
    });
    
    const colorCount = Object.keys(colorGroups).length;
    elements.resultCount.textContent = `총 ${colorCount}개 색상`;
    
    // 색상 목록 생성
    let colorListHTML = '<div class="color-list-section">';
    colorListHTML += '<div class="color-list-header">색상별 재고 정보</div>';
    
    Object.entries(colorGroups).forEach(([color, items]) => {
        colorListHTML += `
            <div class="color-item">
                <div class="color-item-header">
                    <div class="color-name">${color}</div>
                </div>
                <div class="color-item-body">
        `;
        
        items.forEach(item => {
            colorListHTML += `
                <div class="size-row">
                    <div class="size-info">
                        <span class="size-label">사이즈</span>
                        <span class="size-value">${item.size}</span>
                    </div>
                    <div class="stock-info">
                        <div class="stock-item">
                            <span class="stock-label">가능재고</span>
                            <span class="stock-value available">${formatNumber(item.availableStock)}</span>
                        </div>
                        <div class="stock-item">
                            <span class="stock-label">할당재고</span>
                            <span class="stock-value allocated">${formatNumber(item.allocatedStock)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        colorListHTML += `
                </div>
            </div>
        `;
    });
    
    colorListHTML += '</div>';
    elements.colorList.innerHTML = colorListHTML;
    
    elements.result.classList.remove('hidden');
}

// 에러 표시
function showError(message) {
    elements.error.textContent = message;
    elements.error.classList.remove('hidden');
}

// 로딩 표시
function showLoading() {
    elements.loading.classList.remove('hidden');
}

// 로딩 숨기기
function hideLoading() {
    elements.loading.classList.add('hidden');
}

// 모든 메시지 숨기기
function hideAll() {
    elements.error.classList.add('hidden');
    elements.result.classList.add('hidden');
    elements.loading.classList.add('hidden');
}

// 숫자 포맷팅
function formatNumber(value) {
    const num = parseInt(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('ko-KR');
}

// Service Worker 등록 (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
