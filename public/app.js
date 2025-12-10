let authToken = localStorage.getItem('authToken');
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
let isConfigured = false;

const authPages = document.getElementById('authPages');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginPage = document.getElementById('loginPage');
const registerPage = document.getElementById('registerPage');
const logoutBtn = document.getElementById('logoutBtn');
const profileBtn = document.getElementById('profileBtn');
const userInfo = document.getElementById('userInfo');

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

function showAuthPages() {
  authPages.style.display = 'flex';
  mainApp.style.display = 'none';
}

function showMainApp() {
  authPages.style.display = 'none';
  mainApp.style.display = 'block';
  if (currentUser) {
    userInfo.textContent = `👤 ${currentUser.username}`;
  }
}

function switchToRegister(e) {
  e.preventDefault();
  loginPage.style.display = 'none';
  registerPage.style.display = 'flex';
}

function switchToLogin(e) {
  e.preventDefault();
  registerPage.style.display = 'none';
  loginPage.style.display = 'flex';
}

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (response.ok) {
      authToken = result.token;
      currentUser = result.user;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      showNotification('登录成功！', 'success');
      showMainApp();
      loginForm.reset();
      checkConfig().then(() => {
        if (isConfigured) {
          loadImages();
        }
      });
    } else {
      showNotification('登录失败: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('网络错误: ' + error.message, 'error');
  }
};

registerForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password, confirmPassword })
    });

    const result = await response.json();

    if (response.ok) {
      authToken = result.token;
      currentUser = result.user;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      showNotification('注册成功！', 'success');
      showMainApp();
      registerForm.reset();
      checkConfig().then(() => {
        if (isConfigured) {
          loadImages();
        }
      });
    } else {
      showNotification('注册失败: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('网络错误: ' + error.message, 'error');
  }
};

logoutBtn.onclick = async () => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      authToken = null;
      currentUser = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      showNotification('已登出', 'success');
      showAuthPages();
      loginPage.style.display = 'flex';
      registerPage.style.display = 'none';
    }
  } catch (error) {
    showNotification('登出失败: ' + error.message, 'error');
  }
};

profileBtn.onclick = async () => {
  try {
    const response = await fetch('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      const user = result.user;
      const stats = result.stats;

      document.getElementById('profileUsername').textContent = user.username;
      document.getElementById('profileEmail').textContent = user.email;
      document.getElementById('profileCreatedAt').textContent = new Date(user.createdAt).toLocaleDateString('zh-CN');
      document.getElementById('profileImageCount').textContent = stats.imageCount;
      document.getElementById('profileTotalSize').textContent = formatFileSize(stats.totalSize);

      document.getElementById('profileModal').style.display = 'block';
    } else {
      showNotification('获取账号信息失败', 'error');
    }
  } catch (error) {
    showNotification('网络错误: ' + error.message, 'error');
  }
};

function closeProfileModal() {
  document.getElementById('profileModal').style.display = 'none';
}

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
  if (event.target === document.getElementById('profileModal')) {
    closeProfileModal();
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
    const response = await fetch('/api/images', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
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
          <button class="copy-btn" style="background: #f44336;" onclick="deleteImage(${image.id}, this)">
            🗑️ 删除
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

async function deleteImage(imageId, button) {
  if (!confirm('确定要删除这张图片吗？')) {
    return;
  }

  try {
    const response = await fetch(`/api/images/${imageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const result = await response.json();

    if (response.ok) {
      showNotification('图片已删除', 'success');
      loadImages();
    } else {
      showNotification('删除失败: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('删除失败: ' + error.message, 'error');
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
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
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

window.addEventListener('load', () => {
  if (authToken && currentUser) {
    showMainApp();
    checkConfig().then(() => {
      if (isConfigured) {
        loadImages();
      }
    });
  } else {
    showAuthPages();
  }
});
