const configBtn = document.getElementById('configBtn');
const configModal = document.getElementById('configModal');
const closeModal = document.querySelector('.close');
const configForm = document.getElementById('configForm');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const gallery = document.getElementById('gallery');
const refreshBtn = document.getElementById('refreshBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const imageCount = document.getElementById('imageCount');

let isConfigured = false;

configBtn.onclick = () => {
    configModal.style.display = 'block';
    loadConfig();
};

closeModal.onclick = () => {
    configModal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target === configModal) {
        configModal.style.display = 'none';
    }
};

configForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const config = {
        endpoint: document.getElementById('endpoint').value,
        region: document.getElementById('region').value,
        bucket: document.getElementById('bucket').value,
        accessKeyId: document.getElementById('accessKeyId').value,
        secretAccessKey: document.getElementById('secretAccessKey').value,
        publicUrlPrefix: document.getElementById('publicUrlPrefix').value
    };

    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        const result = await response.json();
        
        if (response.ok) {
            showNotification('S3 配置保存成功！', 'success');
            configModal.style.display = 'none';
            isConfigured = true;
            loadImages();
        } else {
            showNotification('配置保存失败: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('网络错误: ' + error.message, 'error');
    }
};

async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const result = await response.json();
        
        if (result.configured && result.config) {
            document.getElementById('endpoint').value = result.config.endpoint || '';
            document.getElementById('region').value = result.config.region || '';
            document.getElementById('bucket').value = result.config.bucket || '';
            document.getElementById('publicUrlPrefix').value = result.config.publicUrlPrefix || '';
        }
    } catch (error) {
        console.error('Failed to load config:', error);
    }
}

async function checkConfig() {
    try {
        const response = await fetch('/api/config');
        const result = await response.json();
        isConfigured = result.configured;
        
        if (!isConfigured) {
            gallery.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚙️</div>
                    <p>请先配置 S3 存储</p>
                </div>
            `;
        }
        
        return isConfigured;
    } catch (error) {
        console.error('Failed to check config:', error);
        return false;
    }
}

async function loadImages() {
    if (!(await checkConfig())) {
        return;
    }

    gallery.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const response = await fetch('/api/images');
        const result = await response.json();
        
        if (response.ok && result.images) {
            displayImages(result.images);
        } else {
            gallery.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>加载失败: ${result.error}</p>
                </div>
            `;
        }
    } catch (error) {
        gallery.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>网络错误: ${error.message}</p>
            </div>
        `;
    }
}

function displayImages(images) {
    if (images.length === 0) {
        gallery.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>暂无图片，请上传图片</p>
            </div>
        `;
        imageCount.textContent = '';
        return;
    }

    imageCount.textContent = `共 ${images.length} 张图片`;
    
    gallery.innerHTML = images.map(image => `
        <div class="image-card">
            <img src="${image.url}" alt="${image.name}" loading="lazy">
            <div class="image-info">
                <div class="image-name" title="${image.name}">${image.name}</div>
                <div class="image-meta">
                    大小: ${formatFileSize(image.size)} | 
                    ${formatDate(image.lastModified)}
                </div>
                <div class="image-url">
                    <input type="text" value="${image.url}" readonly>
                    <button class="copy-btn" onclick="copyToClipboard('${image.url}', this)">
                        📋 复制
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return '今天';
    } else if (diffDays === 1) {
        return '昨天';
    } else if (diffDays < 7) {
        return `${diffDays} 天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = button.innerHTML;
        button.innerHTML = '✅ 已复制';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
        
        showNotification('链接已复制到剪贴板', 'success');
    } catch (error) {
        showNotification('复制失败: ' + error.message, 'error');
    }
}

uploadArea.onclick = () => {
    fileInput.click();
};

uploadArea.ondragover = (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
};

uploadArea.ondragleave = () => {
    uploadArea.classList.remove('drag-over');
};

uploadArea.ondrop = async (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
};

fileInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    await uploadFiles(files);
    fileInput.value = '';
};

async function uploadFiles(files) {
    if (!(await checkConfig())) {
        showNotification('请先配置 S3 存储', 'error');
        return;
    }

    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showNotification('请选择图片文件', 'error');
        return;
    }

    uploadProgress.style.display = 'block';
    let uploadedCount = 0;

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        progressText.textContent = `上传中 ${i + 1}/${imageFiles.length}: ${file.name}`;
        progressFill.style.width = ((i / imageFiles.length) * 100) + '%';

        try {
            await uploadFile(file);
            uploadedCount++;
        } catch (error) {
            showNotification(`上传 ${file.name} 失败: ${error.message}`, 'error');
        }
    }

    progressFill.style.width = '100%';
    progressText.textContent = `完成！成功上传 ${uploadedCount}/${imageFiles.length} 张图片`;

    setTimeout(() => {
        uploadProgress.style.display = 'none';
        progressFill.style.width = '0%';
        loadImages();
    }, 2000);

    if (uploadedCount > 0) {
        showNotification(`成功上传 ${uploadedCount} 张图片`, 'success');
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '上传失败');
    }

    return await response.json();
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

refreshBtn.onclick = loadImages;

checkConfig().then(() => {
    if (isConfigured) {
        loadImages();
    }
});
