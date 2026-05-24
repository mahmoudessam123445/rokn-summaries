// ===== Firebase Configuration =====
// ⚠️ IMPORTANT: Replace YOUR-PROJECT with your actual Firebase project name!
const FIREBASE_DATABASE_URL = 'https://rokn-summaries-default-rtdb.firebaseio.com/';

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

// ===== Admin Check =====
function isAdmin() {
    return !!localStorage.getItem('firebaseDatabaseURL');
}

// ===== Escape HTML =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Fetch Summaries =====
async function fetchSummaries() {
    const dbUrl = FIREBASE_DATABASE_URL;

    if (!dbUrl || dbUrl.includes('YOUR-PROJECT')) {
        console.error('Firebase URL not configured!');
        throw new Error('Firebase URL not configured. Please update script.js');
    }

    const response = await fetch(dbUrl + 'summaries.json');
    if (!response.ok) {
        throw new Error('Failed to fetch: ' + response.status);
    }

    const data = await response.json();
    if (!data) return [];

    const summaries = [];
    for (const key in data) {
        summaries.push({ id: key, ...data[key] });
    }

    // Sort by date (newest first)
    return summaries.sort((a, b) => {
        const dateA = new Date(a.uploadedAt || 0);
        const dateB = new Date(b.uploadedAt || 0);
        return dateB - dateA;
    });
}

// ===== Delete Summary =====
async function deleteSummary(summaryId) {
    if (!confirm('⚠️ هل أنت متأكد إنك عايز تمسح الملخص ده؟')) {
        return;
    }

    const dbUrl = localStorage.getItem('firebaseDatabaseURL') || FIREBASE_DATABASE_URL;

    try {
        const response = await fetch(dbUrl + 'summaries/' + summaryId + '.json', {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete');
        }

        await loadSummaries();
        alert('✅ تم الحذف بنجاح!');
    } catch (error) {
        console.error('Delete error:', error);
        alert('❌ حدث خطأ أثناء الحذف');
    }
}

// ===== View File =====
function viewFile(fileData, fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();

    // Check if it's a URL (from Storage) or base64
    const isUrl = fileData && fileData.startsWith('http');

    // Images - show in new window
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        const newWindow = window.open('about:blank', '_blank');
        if (newWindow) {
            newWindow.document.write('<!DOCTYPE html><html><head><title>' + fileName + '</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;}img{max-width:95%;max-height:95vh;box-shadow:0 4px 20px rgba(0,0,0,0.3);}</style></head><body><img src="' + fileData + '"></body></html>');
            newWindow.document.close();
        }
    } 
    // PDFs - open in new tab (works for both URLs and base64)
    else if (ext === 'pdf') {
        window.open(fileData, '_blank');
    }
    // Other files - download
    else {
        const link = document.createElement('a');
        link.href = fileData;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ===== Load Summaries =====
async function loadSummaries() {
    const summariesList = document.getElementById('summariesList');
    const emptyState = document.getElementById('emptyState');

    if (!summariesList) return;

    summariesList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;"><div style="width:50px;height:50px;border:4px solid #e8f0fe;border-top-color:#1a5fb4;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div><p style="color:#4a4a4a;">جاري تحميل الملخصات...</p></div>';

    const spinStyle = document.createElement('style');
    spinStyle.textContent = '@keyframes spin{to{transform:rotate(360deg);}}';
    document.head.appendChild(spinStyle);

    try {
        const summaries = await fetchSummaries();
        const admin = isAdmin();

        if (summaries.length === 0) {
            summariesList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        summariesList.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';
        summariesList.innerHTML = '';

        summaries.forEach((summary) => {
            const card = document.createElement('div');
            card.className = 'summary-card';

            const title = escapeHtml(summary.title || summary.fileName || 'ملخص بدون عنوان');
            const desc = escapeHtml(summary.description || 'لا يوجد وصف');
            const date = summary.date || (summary.uploadedAt ? new Date(summary.uploadedAt).toLocaleDateString('ar-EG') : 'غير معروف');
            const subject = escapeHtml(summary.subject || 'عام');
            const fileUrl = summary.fileUrl || summary.fileData || '';
            const fileName = escapeHtml(summary.fileName || 'file');
            const isPDF = (fileName || '').toLowerCase().endsWith('.pdf');

            let deleteBtn = '';
            if (admin) {
                deleteBtn = '<button class="delete-btn" onclick="deleteSummary('' + summary.id + '')" title="حذف الملخص">🗑️ حذف</button>';
            }

            card.innerHTML = '<div class="summary-icon">📄</div>' +
                '<h3 class="summary-title">' + title + '</h3>' +
                '<p class="summary-desc">' + desc + '</p>' +
                '<div class="summary-meta">' +
                    '<span class="summary-date">📅 ' + date + '</span>' +
                    '<span class="summary-subject">📚 ' + subject + '</span>' +
                '</div>' +
                '<div class="summary-actions">' +
                    '<a href="' + fileUrl + '" download="' + fileName + '" class="download-btn">⬇️ تحميل</a>' +
                    '<button class="view-btn" data-action="view">' + (isPDF ? '⬇️ تحميل' : '👁️ عرض') + '</button>' +
                    deleteBtn +
                '</div>';

            const viewBtn = card.querySelector('[data-action="view"]');
            if (viewBtn) {
                viewBtn.addEventListener('click', function() {
                    viewFile(fileData, fileName);
                });
            }

            summariesList.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
        summariesList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;"><div style="font-size:3rem;margin-bottom:15px;">⚠️</div><h3 style="color:#e01b24;margin-bottom:10px;">مشكلة في الاتصال</h3><p style="color:#4a4a4a;">' + escapeHtml(error.message) + '</p></div>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('summariesList')) {
        loadSummaries();
    }
});
