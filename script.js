// ===== Firebase Configuration =====
const FIREBASE_DATABASE_URL = 'https://rokn-summaries-default-rtdb.firebaseio.com/';

// ===== Departments =====
const DEPARTMENTS = {
    'preparatory': 'إعدادي',
    'communications': 'اتصالات',
    'civil': 'مدني',
    'chemistry': 'كيمياء',
    'general': 'عام'
};

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
shakeStyle.textContent = '
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
        20%, 40%, 60%, 80% { transform: translateX(8px); }
    }
';
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

// ===== Get Department Name =====
function getDeptName(key) {
    return DEPARTMENTS[key] || key || 'عام';
}

// ===== Get Department Key =====
function getDeptKey(name) {
    for (const [key, val] of Object.entries(DEPARTMENTS)) {
        if (val === name) return key;
    }
    return 'general';
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

// ===== Open Edit Modal =====
function openEditModal(summaryId) {
    const dbUrl = localStorage.getItem('firebaseDatabaseURL') || FIREBASE_DATABASE_URL;

    fetch(dbUrl + 'summaries/' + summaryId + '.json')
        .then(r => r.json())
        .then(data => {
            if (!data) return;
            document.getElementById('editId').value = summaryId;
            document.getElementById('editTitle').value = data.title || '';
            document.getElementById('editSubject').value = data.subject || '';
            document.getElementById('editDescription').value = data.description || '';
            document.getElementById('editDepartment').value = data.department || 'general';
            document.getElementById('editFileUrl').value = data.fileUrl || '';
            document.getElementById('editFileName').value = data.fileName || '';
            document.getElementById('editFileNameDisplay').textContent = data.fileName || 'لا يوجد ملف';

            const modal = document.getElementById('editModal');
            if (modal) modal.classList.add('active');
        })
        .catch(err => {
            console.error('Error loading summary:', err);
            alert('حدث خطأ أثناء تحميل بيانات الملخص');
        });
}

// ===== Close Edit Modal =====
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.remove('active');
}

// ===== Handle Edit File Select =====
let editSelectedFile = null;

function handleEditFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    editSelectedFile = file;
    document.getElementById('editFileNameDisplay').textContent = file.name;
}

// ===== Save Edit =====
async function saveEdit(event) {
    event.preventDefault();

    const summaryId = document.getElementById('editId').value;
    const dbUrl = localStorage.getItem('firebaseDatabaseURL') || FIREBASE_DATABASE_URL;

    const btn = document.getElementById('editSubmitBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    btn.disabled = true;

    try {
        let fileUrl = document.getElementById('editFileUrl').value;
        let fileName = document.getElementById('editFileName').value;
        let fileType = '';
        let fileSize = 0;

        // If new file selected, upload to Cloudinary
        if (editSelectedFile) {
            const CLOUDINARY_CLOUD_NAME = 'duwg52apm';
            const CLOUDINARY_UPLOAD_PRESET = 'rokn_summaries';

            const formData = new FormData();
            formData.append('file', editSelectedFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', 'rokn_summaries');

            const cloudinaryResponse = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
                { method: 'POST', body: formData }
            );

            if (!cloudinaryResponse.ok) {
                const error = await cloudinaryResponse.json();
                throw new Error(error.error?.message || 'فشل رفع الملف الجديد');
            }

            const cloudinaryResult = await cloudinaryResponse.json();
            fileUrl = cloudinaryResult.secure_url;
            fileName = editSelectedFile.name;
            fileType = editSelectedFile.type;
            fileSize = editSelectedFile.size;
        }

        const updatedSummary = {
            title: document.getElementById('editTitle').value.trim(),
            subject: document.getElementById('editSubject').value.trim(),
            description: document.getElementById('editDescription').value.trim(),
            department: document.getElementById('editDepartment').value,
            fileUrl: fileUrl,
            fileName: fileName,
            ...(fileType ? { fileType: fileType } : {}),
            ...(fileSize ? { fileSize: fileSize } : {}),
            updatedAt: new Date().toISOString()
        };

        const response = await fetch(dbUrl + 'summaries/' + summaryId + '.json', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSummary)
        });

        if (!response.ok) throw new Error('فشل حفظ التعديلات');

        closeEditModal();
        await loadSummaries();
        alert('✅ تم التعديل بنجاح!');

    } catch (error) {
        console.error('Edit error:', error);
        alert('❌ خطأ: ' + error.message);
    } finally {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        btn.disabled = false;
        editSelectedFile = null;
    }

    return false;
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
let allSummaries = [];
let currentFilter = 'all';

function filterByDept(dept) {
    currentFilter = dept;

    // Update active button
    document.querySelectorAll('.dept-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.dept === dept) {
            btn.classList.add('active');
        }
    });

    renderSummaries();
}

function updateDeptCounts() {
    const counts = { all: 0, preparatory: 0, communications: 0, civil: 0, chemistry: 0, general: 0 };

    allSummaries.forEach(s => {
        const dept = s.department || 'general';
        counts.all++;
        if (counts[dept] !== undefined) {
            counts[dept]++;
        }
    });

    for (const [dept, count] of Object.entries(counts)) {
        const el = document.getElementById('count-' + dept);
        if (el) el.textContent = count;
    }
}

function renderSummaries() {
    const list = document.getElementById('summariesList');
    const empty = document.getElementById('emptyState');

    if (!list) return;

    // Filter summaries
    let filtered = allSummaries;
    if (currentFilter !== 'all') {
        filtered = allSummaries.filter(s => (s.department || 'general') === currentFilter);
    }

    if (filtered.length === 0) {
        list.style.display = 'none';
        if (empty) {
            empty.style.display = 'block';
            if (currentFilter !== 'all') {
                const deptName = getDeptName(currentFilter);
                empty.querySelector('h3').textContent = 'لا توجد ملخصات في قسم ' + deptName;
                empty.querySelector('p').textContent = 'جرب تختار قسم تاني أو ضيف ملخصات جديدة!';
            } else {
                empty.querySelector('h3').textContent = 'لا توجد ملخصات حالياً';
                empty.querySelector('p').textContent = 'المحتوى هيتضاف قريباً، ترقبوا!';
            }
        }
        return;
    }

    list.style.display = 'grid';
    if (empty) empty.style.display = 'none';
    list.innerHTML = '';

    const admin = isAdmin();

    // Show current department header
    if (currentFilter !== 'all') {
        const deptHeader = document.createElement('div');
        deptHeader.className = 'current-dept-header ' + currentFilter;
        deptHeader.innerHTML = `
            <span style="font-size:1.5rem;">📁</span>
            ${getDeptName(currentFilter)}
            <span class="current-dept-count">${filtered.length} ملخص</span>
        `;
        list.appendChild(deptHeader);
    }

    filtered.forEach((summary) => {
        const card = document.createElement('div');
        card.className = 'summary-card';

        const title = escapeHtml(summary.title || summary.fileName || 'ملخص');
        const desc = escapeHtml(summary.description || '');
        const date = summary.date || 'غير معروف';
        const subject = escapeHtml(summary.subject || 'عام');
        const fileUrl = summary.fileUrl || summary.fileData || '';
        const fileName = escapeHtml(summary.fileName || 'file');
        const dept = summary.department || 'general';

        let adminActions = '';
        if (admin) {
            adminActions = `
                <button class="edit-btn" onclick="openEditModal('${summary.id}')">✏️ تعديل</button>
                <button class="delete-btn" onclick="deleteSummary('${summary.id}')">🗑️ حذف</button>
            `;
        }

        card.innerHTML = `
            <div class="summary-icon">📄</div>
            <h3 class="summary-title">${title}</h3>
            <p class="summary-desc">${desc}</p>
            <div class="summary-meta">
                <span class="summary-date">📅 ${date}</span>
                <span class="summary-subject">📚 ${subject}</span>
            </div>
            <div class="summary-actions">
                <a href="${fileUrl}" download="${fileName}" class="download-btn">⬇️ تحميل</a>
                <button class="view-btn">👁️ عرض</button>
                ${adminActions}
            </div>
        `;

        const btn = card.querySelector('.view-btn');
        if (btn) {
            btn.addEventListener('click', function() {
                viewFile(fileUrl, fileName);
            });
        }

        list.appendChild(card);
    });
}

async function loadSummaries() {
    const list = document.getElementById('summariesList');

    if (!list) return;

    list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;"><div style="width:50px;height:50px;border:4px solid #e8f0fe;border-top-color:#1a5fb4;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div><p>جاري التحميل...</p></div>';

    const s = document.createElement('style');
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);

    try {
        allSummaries = await fetchSummaries();
        updateDeptCounts();
        renderSummaries();
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
