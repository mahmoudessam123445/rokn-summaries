// ===== Firebase Configuration =====
// ⚠️ IMPORTANT: Replace this with your actual Firebase Database URL!
const FIREBASE_DATABASE_URL = 'https://rokn-summaries-default-rtdb.firebaseio.com/';

let summariesData = [];
let isLoading = false;

// ===== Password Modal =====
const CORRECT_PASSWORD = 'rokn2026';

function openPasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (!modal) return;
    modal.classList.add('active');
    const input = document.getElementById('passwordInput');
    if (input) {
        input.value = '';
        input.focus();
    }
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) errorMsg.textContent = '';
}

function closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) modal.classList.remove('active');
}

function checkPassword() {
    const input = document.getElementById('passwordInput');
    const errorMsg = document.getElementById('errorMsg');
    if (!input || !errorMsg) return;

    const password = input.value.trim();

    if (!password) {
        errorMsg.textContent = '⚠️ يرجى إدخال كلمة المرور';
        input.focus();
        return;
    }

    if (password === CORRECT_PASSWORD) {
        closePasswordModal();
        window.location.href = 'add-summary.html';
    } else {
        errorMsg.textContent = '❌ كلمة المرور غير صحيحة، حاول مرة أخرى';
        input.value = '';
        input.focus();

        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.animation = 'none';
            setTimeout(() => {
                modalContent.style.animation = 'shake 0.5s ease';
            }, 10);
        }
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        checkPassword();
    }
    if (event.key === 'Escape') {
        closePasswordModal();
    }
}

// Close modal on overlay click
document.addEventListener('click', function(event) {
    const modal = document.getElementById('passwordModal');
    if (event.target === modal) {
        closePasswordModal();
    }
});

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
        20%, 40%, 60%, 80% { transform: translateX(8px); }
    }
`;
document.head.appendChild(shakeStyle);

// ===== Admin Mode Detection =====
// Check if admin is logged in (has Firebase URL in localStorage)
function isAdmin() {
    return !!localStorage.getItem('firebaseDatabaseURL');
}

// ===== Firebase API Functions =====

async function fetchSummaries() {
    const dbUrl = FIREBASE_DATABASE_URL;

    if (!dbUrl || dbUrl.includes('YOUR-PROJECT')) {
        console.error('❌ Firebase URL not configured!');
        showErrorOnPage('لم يتم إعداد قاعدة البيانات', 
            'الرجاء تعديل ملف script.js واستبدال YOUR-PROJECT باسم مشروعك في Firebase');
        return [];
    }

    try {
        const response = await fetch(`${dbUrl}summaries.json`, {
            method: 'GET'
        });

        if (!response.ok) {
            if (response.status === 404) {
                return [];
            }
            if (response.status === 401 || response.status === 403) {
                showErrorOnPage('مشكلة في الصلاحيات', 
                    'تأكد من Firebase Rules - لازم تكون ".read": true');
                throw new Error(`Permission denied (${response.status})`);
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data) return [];

        // Firebase returns object with keys, convert to array
        const summaries = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));

        // Sort by date (newest first)
        return summaries.sort((a, b) => {
            const dateA = new Date(a.uploadedAt || 0);
            const dateB = new Date(b.uploadedAt || 0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error('❌ Error fetching summaries:', error);
        showErrorOnPage('مشكلة في الاتصال', error.message);
        return [];
    }
}

async function deleteSummary(summaryId) {
    const dbUrl = localStorage.getItem('firebaseDatabaseURL') || FIREBASE_DATABASE_URL;

    if (!dbUrl || dbUrl.includes('YOUR-PROJECT')) {
        alert('❌ مفيش Firebase URL محفوظ. روح لصفحة الإضافة وسجل دخول أولاً.');
        return false;
    }

    if (!confirm('⚠️ هل أنت متأكد إنك عايز تمسح الملخص ده؟')) {
        return false;
    }

    try {
        const response = await fetch(`${dbUrl}summaries/${summaryId}.json`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete: ${response.status}`);
        }

        // Refresh the list
        await loadSummaries();
        return true;
    } catch (error) {
        console.error('❌ Error deleting summary:', error);
        alert('❌ حدث خطأ أثناء الحذف: ' + error.message);
        return false;
    }
}

function showErrorOnPage(title, message) {
    const summariesList = document.getElementById('summariesList');
    if (summariesList) {
        summariesList.innerHTML = `
            <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--white); border-radius: var(--radius);">
                <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                <h3 style="color: var(--danger); margin-bottom: 10px;">${escapeHtml(title)}</h3>
                <p style="color: var(--text-medium); margin-bottom: 15px;">${escapeHtml(message)}</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: right; direction: ltr;">
                    <p style="font-size: 0.85rem; color: var(--text-light); margin: 0;">
                        <strong>Debug info:</strong><br>
                        URL: ${FIREBASE_DATABASE_URL}<br>
                        Check browser console (F12) for more details
                    </p>
                </div>
            </div>
        `;
    }
}

// ===== Load Summaries (for summaries.html) =====
async function loadSummaries() {
    const summariesList = document.getElementById('summariesList');
    const emptyState = document.getElementById('emptyState');

    if (!summariesList) return;

    // Show loading
    summariesList.innerHTML = `
        <div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <div class="loading-spinner" style="width: 50px; height: 50px; border: 4px solid var(--primary-light); 
                 border-top-color: var(--primary); border-radius: 50%; 
                 animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
            <p style="color: var(--text-medium);">جاري تحميل الملخصات...</p>
        </div>
    `;

    const spinStyle = document.createElement('style');
    spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(spinStyle);

    try {
        summariesData = await fetchSummaries();
        const admin = isAdmin();

        if (summariesData.length === 0) {
            summariesList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        summariesList.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';
        summariesList.innerHTML = '';

        summariesData.forEach((summary, index) => {
            const card = document.createElement('div');
            card.className = 'summary-card';

            const title = escapeHtml(summary.title || summary.fileName || 'ملخص بدون عنوان');
            const desc = escapeHtml(summary.description || 'لا يوجد وصف');
            const date = summary.date || (summary.uploadedAt ? new Date(summary.uploadedAt).toLocaleDateString('ar-EG') : 'غير معروف');
            const subject = escapeHtml(summary.subject || 'عام');
            const fileData = summary.fileData || '';
            const fileName = escapeHtml(summary.fileName || 'file');

            // Add delete button only for admin
            const deleteButton = admin ? `
                <button class="delete-btn" onclick="deleteSummary('${summary.id}')" title="حذف الملخص">
                    🗑️ حذف
                </button>
            ` : '';

            card.innerHTML = `
                <div class="summary-icon">📄</div>
                <h3 class="summary-title">${title}</h3>
                <p class="summary-desc">${desc}</p>
                <div class="summary-meta">
                    <span class="summary-date">📅 ${date}</span>
                    <span class="summary-subject">📚 ${subject}</span>
                </div>
                <div class="summary-actions">
                    <a href="${fileData}" download="${fileName}" class="download-btn">⬇️ تحميل</a>
                    <button class="view-btn" onclick="viewFile('${fileData}', '${fileName}')">👁️ عرض</button>
                    ${deleteButton}
                </div>
            `;
            summariesList.appendChild(card);
        });

        console.log('✅ Loaded', summariesData.length, 'summaries. Admin mode:', admin);
    } catch (error) {
        console.error('❌ Error in loadSummaries:', error);
    } finally {
        isLoading = false;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function viewFile(fileData, fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        const newWindow = window.open();
        newWindow.document.write(`<img src="${fileData}" style="max-width:100%;height:auto;">`);
    } else if (ext === 'pdf') {
        const newWindow = window.open();
        newWindow.document.write(`<iframe src="${fileData}" width="100%" height="100%" style="border:none;"></iframe>`);
    } else {
        window.open(fileData, '_blank');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('summariesList')) {
        loadSummaries();
    }
});
