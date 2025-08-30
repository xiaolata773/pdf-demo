// 初始化日期字段
document.getElementById('reportDate').valueAsDate = new Date();
document.getElementById('signatoryDate1').value = new Date().toISOString().slice(0, 16);
document.getElementById('signatoryDate2').value = new Date().toISOString().slice(0, 16);
document.getElementById('signatoryDate3').value = new Date().toISOString().slice(0, 16);

// 存储签名板和签名数据
let signaturePads = {};
let signatureDatas = {};
let uploadedPhotos = [];

// === 新增代码开始 ===
// 图片预加载函数
async function preloadAllImages() {
    const images = [
        'ZTT-logo.png',
        'https://via.placeholder.com/150x50/2c3e50/ffffff?text=公司Logo2',
        'https://via.placeholder.com/150x50/e74c3c/ffffff?text=公司Logo3'
    ];
    
    const loadPromises = images.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src;
        });
    });
    
    await Promise.all(loadPromises);
    await new Promise(resolve => setTimeout(resolve, 100));
}
// === 新增代码结束 ===

function getImageBase64(src) {
    return new Promise((resolve) => {
        // 对于本地文件，创建一个blob URL
        if (src.startsWith('http') || src.startsWith('data:')) {
            // 处理网络图片或base64图片
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    console.error('图片转换失败:', error);
                    resolve('https://via.placeholder.com/150x50/007bff/ffffff?text=Logo加载失败');
                }
            };
            img.onerror = function() {
                console.error('图片加载失败:', src);
                resolve('https://via.placeholder.com/150x50/007bff/ffffff?text=Logo加载失败');
            };
            img.src = src;
        } else {
            // 处理本地文件 - 使用fetch API
            fetch(src)
                .then(response => response.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onload = function() {
                        resolve(reader.result);
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(error => {
                    console.error('本地图片加载失败:', error);
                    resolve('https://via.placeholder.com/150x50/007bff/ffffff?text=Logo加载失败');
                });
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化签名板 - 添加短暂延迟确保DOM完全加载
    setTimeout(function() {
        initSignaturePads();
        
        // 初始化照片上传
        initPhotoUpload();
        
        // 绑定事件
        bindEvents();
        
        // 绑定初始删除按钮事件
        bindInitialDeleteEvents();
    }, 100);
});

// 初始化所有签名板
function initSignaturePads() {
    for (let i = 1; i <= 3; i++) {
        const canvas = document.getElementById(`signaturePad${i}`);
        
        // 先设置canvas的尺寸属性
        canvas.width = 400;
        canvas.height = 150;
        
        // 初始化签名板 - 确保背景完全不透明
        signaturePads[i] = new SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)', // 使用rgb确保完全不透明
            penColor: 'rgb(0, 0, 0)',
            minWidth: 1.5,
            maxWidth: 3,
            throttleSeconds: 0.01 // 提高绘制流畅度
        });
        
        // 添加样式使画布可见
        canvas.style.border = "2px solid #ccc";
        canvas.style.borderRadius = "6px";
        canvas.style.backgroundColor = "#fff";
        canvas.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        
        // 初始为空
        signatureDatas[i] = '';
        
        // 绑定调整大小事件
        window.addEventListener('resize', function() {
            resizeCanvas(canvas, signaturePads[i]);
        });
    }
}

// 调整canvas大小的辅助函数
function resizeCanvas(canvas, signaturePad) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    
    // 重新绘制已有签名
    if (!signaturePad.isEmpty()) {
        const data = signaturePad.toData();
        signaturePad.clear();
        signaturePad.fromData(data);
    }
}

// 初始化照片上传功能
function initPhotoUpload() {
    const photoUploadArea = document.getElementById('photoUploadArea');
    const photoInput = document.getElementById('photoInput');
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');
    
    // 点击上传区域触发文件选择
    photoUploadArea.addEventListener('click', function() {
        photoInput.click();
    });
    
    // 拖放功能
    photoUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        photoUploadArea.style.borderColor = '#3498db';
        photoUploadArea.style.backgroundColor = '#e3f2fd';
    });
    
    photoUploadArea.addEventListener('dragleave', function() {
        photoUploadArea.style.borderColor = '#ccc';
        photoUploadArea.style.backgroundColor = '#f9f9f9';
    });
    
    photoUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        photoUploadArea.style.borderColor = '#ccc';
        photoUploadArea.style.backgroundColor = '#f9f9f9';
        
        if (e.dataTransfer.files.length > 0) {
            handlePhotoFiles(e.dataTransfer.files);
        }
    });
    
    // 文件选择变化
    photoInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handlePhotoFiles(this.files);
            this.value = ''; // 重置input，允许重复选择相同文件
        }
    });
    
    // 处理照片文件
    function handlePhotoFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.match('image.*')) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const photoData = {
                        name: file.name,
                        dataUrl: e.target.result
                    };
                    
                    uploadedPhotos.push(photoData);
                    renderPhotoPreview(photoData);
                };
                
                reader.readAsDataURL(file);
            }
        }
    }
    
    // 渲染照片预览
    function renderPhotoPreview(photoData) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'photo-preview';
        previewDiv.innerHTML = `
            <img src="${photoData.dataUrl}" alt="${photoData.name}">
            <div class="remove-photo" data-name="${photoData.name}">×</div>
        `;
        
        // 添加删除事件
        previewDiv.querySelector('.remove-photo').addEventListener('click', function(e) {
            e.stopPropagation();
            const photoName = this.getAttribute('data-name');
            uploadedPhotos = uploadedPhotos.filter(photo => photo.name !== photoName);
            previewDiv.remove();
        });
        
        photoPreviewContainer.appendChild(previewDiv);
    }
}

// 绑定所有事件
function bindEvents() {
    // 工作条目：添加
    document.getElementById('addWorkEntry').addEventListener('click', function() {
        const workEntries = document.getElementById('workEntries');
        const newEntry = workEntries.children[0].cloneNode(true);
        
        // 清空输入值（保留序号逻辑）
        const inputs = newEntry.querySelectorAll('input');
        inputs.forEach((input, idx) => {
            if (input.type !== 'button' && !input.classList.contains('entry-sn')) {
                input.value = '';
            }
        });
        
        // 重新设置序号
        const serialNumber = workEntries.children.length + 1;
        newEntry.querySelector('.entry-sn').value = serialNumber;
        
        // 绑定删除事件
        newEntry.querySelector('.remove-entry').addEventListener('click', function() {
            removeEntry(this);
        });
        
        workEntries.appendChild(newEntry);
    });
    
    // 事件记录：添加
    document.getElementById('addEventEntry').addEventListener('click', function() {
        const eventEntries = document.getElementById('eventEntries');
        const newEvent = eventEntries.children[0].cloneNode(true);
        
        // 清空输入值
        const inputs = newEvent.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type !== 'button') input.value = '';
        });
        
        // 绑定删除事件
        newEvent.querySelector('.remove-event').addEventListener('click', function() {
            removeEvent(this);
        });
        
        eventEntries.appendChild(newEvent);
    });
    
    // 分发列表：添加
    document.getElementById('addDistribution').addEventListener('click', function() {
        const distributionList = document.getElementById('distributionList');
        const newItem = distributionList.children[0].cloneNode(true);
        
        // 清空输入值
        newItem.querySelector('.dist-name').value = '';
        newItem.querySelector('.dist-email').value = '';
        
        // 绑定删除事件
        newItem.querySelector('.remove-distribution').addEventListener('click', function() {
            this.parentElement.remove();
        });
        
        distributionList.appendChild(newItem);
    });
    
    // 签名按钮事件
    document.querySelectorAll('.signature-actions button').forEach(button => {
        button.addEventListener('click', function() {
            const signatureId = this.getAttribute('data-signature');
            
            if (this.classList.contains('btn-secondary')) {
                // 清除签名
                clearSingleSignature(signatureId);
            } else {
                // 保存签名
                saveSingleSignature(signatureId);
            }
        });
    });
    
    // PDF生成按钮
    document.getElementById('generateBtn').addEventListener('click', generatePDF);
}

// 绑定初始删除按钮事件
function bindInitialDeleteEvents() {
    // 工作条目删除
    document.querySelectorAll('.remove-entry').forEach(button => {
        button.addEventListener('click', function() {
            removeEntry(this);
        });
    });
    
    // 事件记录删除
    document.querySelectorAll('.remove-event').forEach(button => {
        button.addEventListener('click', function() {
            removeEvent(this);
        });
    });
    
    // 分发列表删除
    document.querySelectorAll('.remove-distribution').forEach(button => {
        button.addEventListener('click', function() {
            this.parentElement.remove();
        });
    });
}

// 移除工作条目
function removeEntry(button) {
    const entries = document.getElementById('workEntries');
    if (entries.children.length > 1) {
        const entryItem = button.closest('.entry-item');
        entryItem.remove();
        
        // 重新排序序号
        Array.from(entries.children).forEach((entry, index) => {
            entry.querySelector('.entry-sn').value = index + 1;
        });
    }
}

// 移除事件记录
function removeEvent(button) {
    const events = document.getElementById('eventEntries');
    if (events.children.length > 1) {
        const eventItem = button.closest('.event-item');
        eventItem.remove();
    }
}

// 清除单个签名
function clearSingleSignature(index) {
    if (signaturePads[index]) {
        signaturePads[index].clear();
        signatureDatas[index] = '';
        updateSignaturePreview(index, '');
        alert(`${index === 1 ? '承包商' : index === 2 ? '监理' : '客户'}签名已清除！`);
    }
}

// 保存单个签名

function saveSingleSignature(index) {
    if (signaturePads[index] && !signaturePads[index].isEmpty()) {
        // 确保使用image/jpeg格式，避免透明背景问题
        signatureDatas[index] = signaturePads[index].toDataURL('image/jpeg');
        updateSignaturePreview(index, signatureDatas[index]);
        alert(`${index === 1 ? '承包商' : index === 2 ? '监理' : '客户'}签名已保存！`);
    } else {
        alert(`请先绘制${index === 1 ? '承包商' : index === 2 ? '监理' : '客户'}签名`);
    }
}

// 更新签名预览
function updateSignaturePreview(index, dataUrl) {
    const previewElement = document.getElementById(`signaturePreview${index}`);
    if (dataUrl) {
        previewElement.innerHTML = `<img src="${dataUrl}" alt="签名预览" style="max-width: 100%; height: auto;">`;
    } else {
        previewElement.innerHTML = '<p class="text-muted">请在上面签名区域签名</p>'; // 修改提示文字
    }
}

// 修改generatePDF函数为异步函数
async function generatePDF() {
    try {
        // 显示加载提示
        const generateBtn = document.getElementById('generateBtn');
        const originalText = generateBtn.textContent;
        generateBtn.textContent = '正在生成PDF...';
        generateBtn.disabled = true;
        
        // 预加载所有图片
        await preloadAllImages();
        
        // 先生成预览
        try {
            // 转换logo为base64
            const logoBase64 = await getImageBase64('ZTT-logo.png');
            generatePreview(logoBase64);
        } catch (error) {
            console.error('Logo转换失败:', error);
            generatePreview('https://via.placeholder.com/150x50/007bff/ffffff?text=Logo加载失败');
        }
        
        // 等待预览渲染完成
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 获取PDF依赖库
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert('PDF生成库加载失败，请刷新页面重试！');
            return;
        }
        
        // 创建A4纵向PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // 获取预览元素
        const element = document.getElementById('pdfPreview');
        element.style.display = 'block';
        
        // 使用html2canvas生成高清图像
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: false,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
        });
        
        // 隐藏预览
        element.style.display = 'none';
        
        // 计算图像在PDF中的尺寸
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // 处理长内容分页
        let position = 10;
        const pageHeight = pdfHeight - 20;
        let currentPage = 1;
        let totalPages = Math.ceil(imgHeight / pageHeight);
        
        // 添加页码水印函数
        const addPageNumber = (pageNum, totalPages) => {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            const pageText = `Page ${pageNum} of ${totalPages}`;
            pdf.text(pageText, pdfWidth - 20, pdfHeight - 5);
        };
        
        if (imgHeight <= pageHeight) {
            // 单页显示
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 10, position, imgWidth, imgHeight);
            addPageNumber(1, 1);
        } else {
            // 多页显示（分割图像）
            let remainingHeight = imgHeight;
            let startY = 0;
            
            while (remainingHeight > 0) {
                const currentHeight = remainingHeight > pageHeight ? pageHeight : remainingHeight;
                const canvasSlice = document.createElement('canvas');
                canvasSlice.width = canvas.width;
                canvasSlice.height = (currentHeight * canvas.width) / imgWidth;
                
                const ctx = canvasSlice.getContext('2d');
                ctx.drawImage(
                    canvas,
                    0,
                    startY,
                    canvas.width,
                    (currentHeight * canvas.width) / imgWidth,
                    0,
                    0,
                    canvasSlice.width,
                    canvasSlice.height
                );
                
                pdf.addImage(canvasSlice.toDataURL('image/jpeg', 0.9), 'JPEG', 10, position, imgWidth, currentHeight);
                
                // 添加页码
                addPageNumber(currentPage, totalPages);
                
                if (remainingHeight > pageHeight) {
                    pdf.addPage();
                    currentPage++;
                    position = 10;
                }
                
                remainingHeight -= currentHeight;
                startY += (currentHeight * canvas.width) / imgWidth;
            }
        }
        
        // 保存PDF
        const projectName = document.getElementById('projectName').value || '海上风电项目';
        const reportDate = document.getElementById('reportDate').value || new Date().toISOString().slice(0, 10);
        pdf.save(`${projectName}_每日进度报告_${reportDate}.pdf`);
        
    } catch (error) {
        // 添加catch块来处理错误
        console.error('PDF生成错误:', error);
        alert(`PDF生成失败：${error.message}`);
    } finally {
        // 恢复按钮状态
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.textContent = '生成PDF报告';
            generateBtn.disabled = false;
        }
        document.getElementById('pdfPreview').style.display = 'none';
    }
}

// 生成PDF预览内容
function generatePreview(logoBase64) {
    const projectName = document.getElementById('projectName').value || '海上风电项目';
    const reportDate = document.getElementById('reportDate').value || new Date().toLocaleDateString();
    const reportNumber = document.getElementById('reportNumber').value || '未填写';
    const projectManager = document.getElementById('projectManager').value || '未填写';
    const projectLocation = document.getElementById('projectLocation').value || '未填写';
    


    // 生成工作条目HTML
    const workEntriesHtml = Array.from(document.querySelectorAll('.entry-item')).map(entry => {
        const sn = entry.querySelector('.entry-sn').value;
        const startTime = entry.querySelector('.entry-start-time').value;
        const endTime = entry.querySelector('.entry-end-time').value;
        const activityType = entry.querySelector('.entry-activity-type').value;
        const taskType = entry.querySelector('.entry-task-type').value;
        const completion = entry.querySelector('.entry-completion').value;
        const personnel = entry.querySelector('.entry-personnel').value;
        const description = entry.querySelector('.entry-description').value;
        
        return `
            <tr>
                <td>${sn}</td>
                <td>${startTime || '未填写'}</td>
                <td>${endTime || '未填写'}</td>
                <td>${activityType}</td>
                <td>${taskType || '未填写'}</td>
                <td>${completion || 0}%</td>
                <td>${personnel || 0}</td>
                <td>${description || '未填写'}</td>
            </tr>
        `;
    }).join('');
    
    // 生成事件记录HTML
    const eventEntriesHtml = Array.from(document.querySelectorAll('.event-item')).map(event => {
        const time = event.querySelector('.event-time').value;
        const type = event.querySelector('.event-type').value;
        const description = event.querySelector('.event-description').value;
        const duration = event.querySelector('.event-duration').value;
        const responsible = event.querySelector('.event-responsible').value;
        
        return `
            <tr>
                <td>${time || '未填写'}</td>
                <td>${type}</td>
                <td>${description || '未填写'}</td>
                <td>${duration || 0}</td>
                <td>${responsible || '未填写'}</td>
            </tr>
        `;
    }).join('');
    
    // 生成分发列表HTML
    const distributionHtml = Array.from(document.querySelectorAll('.distribution-item')).map(item => {
        const name = item.querySelector('.dist-name').value;
        const email = item.querySelector('.dist-email').value;
        const department = item.querySelector('.dist-department').value;
        
        return `
            <tr>
                <td>${name || '未填写'}</td>
                <td>${email || '未填写'}</td>
                <td>${department}</td>
            </tr>
        `;
    }).join('');
    
    // 生成照片预览HTML
    const photosHtml = uploadedPhotos.length > 0 ? `
        <h4 class="mt-4 mb-3">工作照片</h4>
        <div class="row g-2">
            ${uploadedPhotos.map(photo => `
                <div class="col-6 col-md-3">
                    <img src="${photo.dataUrl}" alt="${photo.name}" style="width: 100%; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            `).join('')}
        </div>
    ` : '';
    
    const preview = document.getElementById('pdfPreview');
    preview.innerHTML = `
        <div class="pdf-logo">
            <h2>海上风电项目</h2>
            <p>每日进度报告</p>
            <div>
                <img src="${logoBase64}" alt="公司logo" style="max-height: 50px; display: block; margin: 0 auto;">
                
                <img src="https://via.placeholder.com/150x50/2c3e50/ffffff?text=公司Logo2" alt="公司Logo2" style="max-height: 50px;">
                <img src="https://via.placeholder.com/150x50/e74c3c/ffffff?text=公司Logo3" alt="公司Logo3" style="max-height: 50px;">
            </div>
        </div>
        
        <div class="pdf-header">
            <h3>${projectName} 每日进度报告</h3>
            <p>报告日期: ${reportDate}</p>
        </div>
                
        <div class="company-intro">
            <h5>公司介绍</h5>
            <p>xxxxxxxxxxxxxxxxxxx</p>
            <p><strong>联系方式:</strong> 电话: xxxx-xxxxxx | 邮箱: xxxx.com | 地址: 某省某市某xxxxx号</p>
        </div>
                
        <table class="table table-bordered">
            <tr>
                <th width="20%">项目名称</th>
                <td width="30%">${projectName}</td>
                <th width="20%">报告日期</th>
                <td width="30%">${reportDate}</td>
            </tr>
            <tr>
                <th>报告编号</th>
                <td>${reportNumber}</td>
                <th>项目经理</th>
                <td>${projectManager}</td>
            </tr>
            <tr>
                <th>项目地点</th>
                <td colspan="3">${projectLocation}</td>
            </tr>
        </table>
                
        <h4 class="mt-4 mb-3">分发列表</h4>
        <table class="table table-bordered">
            <thead class="table-primary">
                <tr>
                    <th>姓名</th>
                    <th>电子邮件</th>
                    <th>公司/部门</th>
                </tr>
            </thead>
            <tbody>
                ${distributionHtml}
            </tbody>
        </table>
                
        <h4 class="mt-4 mb-3">工作条目</h4>
        <table class="table table-bordered">
            <thead class="table-primary">
                <tr>
                    <th>序号</th>
                    <th>开始时间</th>
                    <th>结束时间</th>
                    <th>活动类型</th>
                    <th>任务类型</th>
                    <th>完成%</th>
                    <th>人数</th>
                    <th>工作内容描述</th>
                </tr>
            </thead>
            <tbody>
                ${workEntriesHtml}
            </tbody>
        </table>
                
        ${photosHtml}
                
        <h4 class="mt-4 mb-3">事件记录</h4>
        <table class="table table-bordered">
            <thead class="table-primary">
                <tr>
                    <th>事件时间</th>
                    <th>事件类型</th>
                    <th>事件描述</th>
                    <th>影响时长(分钟)</th>
                    <th>负责人</th>
                </tr>
            </thead>
            <tbody>
                ${eventEntriesHtml}
            </tbody>
        </table>
                
        <h4 class="mt-4 mb-3">签名确认</h4>
        <div class="row g-4">
            <!-- 承包商签名预览 -->
            <div class="col-md-4">
                <div class="border p-3 rounded">
                    <h5 class="text-center">承包商签名</h5>
                    <div class="text-center my-3">
                        ${signatureDatas[1] ?
                            `<img src="${signatureDatas[1]}" style="max-width: 100%; max-height: 100px; border: 1px solid #ddd; padding: 5px;">` :
                            '<p class="text-muted">无签名</p>'
                        }
                    </div>
                    <p><strong>签署人:</strong> ${document.getElementById('signatoryName1').value || '未填写'}</p>
                    <p><strong>签署日期:</strong> ${document.getElementById('signatoryDate1').value || '未填写'}</p>
                </div>
            </div>
            <!-- 监理签名预览 -->
            <div class="col-md-4">
                <div class="border p-3 rounded">
                    <h5 class="text-center">监理签名</h5>
                    <div class="text-center my-3">
                        ${signatureDatas[2] ?
                            `<img src="${signatureDatas[2]}" style="max-width: 100%; max-height: 100px; border: 1px solid #ddd; padding: 5px;">` :
                            '<p class="text-muted">无签名</p>'
                        }
                    </div>
                    <p><strong>签署人:</strong> ${document.getElementById('signatoryName2').value || '未填写'}</p>
                    <p><strong>签署日期:</strong> ${document.getElementById('signatoryDate2').value || '未填写'}</p>
                </div>
            </div>
            <!-- 客户签名预览 -->
            <div class="col-md-4">
                <div class="border p-3 rounded">
                    <h5 class="text-center">客户签名</h5>
                    <div class="text-center my-3">
                        ${signatureDatas[3] ?
                            `<img src="${signatureDatas[3]}" style="max-width: 100%; max-height: 100px; border: 1px solid #ddd; padding: 5px;">` :
                            '<p class="text-muted">无签名</p>'
                        }
                    </div>
                    <p><strong>签署人:</strong> ${document.getElementById('signatoryName3').value || '未填写'}</p>
                    <p><strong>签署日期:</strong> ${document.getElementById('signatoryDate3').value || '未填写'}</p>
                </div>
            </div>
        </div>
                
        <div class="pdf-footer">
            <p>报告生成时间: ${new Date().toLocaleString()}</p>
            <p class="text-muted">本报告由海上风电项目每日进度报告系统生成，具有同等法律效力</p>
        </div>
    `;
}
