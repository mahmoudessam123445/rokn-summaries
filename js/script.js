// ===== Firebase Configuration =====
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
shakeStyle.textContent = '\n    @keyframes shake {\n        0%, 100% { transform: translateX(0); }\n        10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }\n        20%, 40%, 60%, 80% { transform: translateX(8px); }\n    }\n';
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

    return summaries.sort((a, b) => {
        const dateA = new Date(a.uploadedAt || 0);
        const dateB = new Date(b.uploadedAt || 0);
        return dateB - dateA;
    });
}

// ===== Delete Summary =====
async function deleteSummary(summaryId) {
    if (!confirm('هل أنت متأكد؟')) return;

    const dbUrl = localStorage.getItem('firebaseDatabaseURL') || FIREBASE_DATABASE_URL;

    try {
        await fetch(dbUrl + 'summaries/' + summaryId + '.json', { method: 'DELETE' });
        await loadSummaries();
    } catch (error) {
        console.error('Delete error:', error);
        alert('حدث خطأ أثناء الحذف');
    }
}

// ===== View File =====
function viewFile(fileUrl, fileName) {
    if (!fileUrl) return;

    const ext = (fileName || '').split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        const w = window.open('about:blank', '_blank');
        if (w) {
            w.document.write('<!DOCTYPE html><html><head><title>' + fileName + '</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;}img{max-width:95%;max-height:95vh;}</style></head><body><img src="' + fileUrl + '"></body></html>');
            w.document.close();
        }
    } else {
        window.open(fileUrl, '_blank');
    }
}

// ===== Load Summaries =====
async function loadSummaries() {
    const list = document.getElementById('summariesList');
    const empty = document.getElementById('emptyState');

    if (!list) return;

    list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;"><div style="width:50px;height:50px;border:4px solid #e8f0fe;border-top-color:#1a5fb4;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div><p>جاري التحميل...</p></div>';

    const s = document.createElement('style');
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);

    try {
        const summaries = await fetchSummaries();
        const admin = isAdmin();

        if (summaries.length === 0) {
            list.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }

        list.style.display = 'grid';
        if (empty) empty.style.display = 'none';
        list.innerHTML = '';

        summaries.forEach((summary) => {
            const card = document.createElement('div');
            card.className = 'summary-card';

            const title = escapeHtml(summary.title || summary.fileName || 'ملخص');
            const desc = escapeHtml(summary.description || '');
            const date = summary.date || 'غير معروف';
            const subject = escapeHtml(summary.subject || 'عام');
            const fileUrl = summary.fileUrl || summary.fileData || '';
            const fileName = escapeHtml(summary.fileName || 'file');

            let delBtn = '';
            if (admin) {
                delBtn = '<button class="delete-btn" onclick="deleteSummary(\'' + summary.id + '\')">🗑️ حذف</button>';
            }

            card.innerHTML = '<div class="summary-icon">📄</div><h3 class="summary-title">' + title + '</h3><p class="summary-desc">' + desc + '</p><div class="summary-meta"><span class="summary-date">📅 ' + date + '</span><span class="summary-subject">📚 ' + subject + '</span></div><div class="summary-actions"><a href="' + fileUrl + '" download="' + fileName + '" class="download-btn">⬇️ تحميل</a><button class="view-btn">👁️ عرض</button>' + delBtn + '</div>';

            const btn = card.querySelector('.view-btn');
            if (btn) {
                btn.addEventListener('click', function() {
                    viewFile(fileUrl, fileName);
                });
            }

            list.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
        list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;"><h3 style="color:#e01b24;">خطأ</h3><p>' + escapeHtml(error.message) + '</p></div>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('summariesList')) {
        loadSummaries();
    }
});
