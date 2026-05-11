const UI = {
    btn: document.getElementById('start-btn'),
    url: document.getElementById('url'),
    apiKey: document.getElementById('apiKey'),
    content: document.getElementById('content'),
    wrapper: document.getElementById('output-wrapper'),
    status: document.getElementById('status'),
    loader: document.getElementById('loader'),
    title: document.getElementById('setup-title')
};

// 初始化监听
UI.btn.addEventListener('click', startGeneration);

async function startGeneration() {
    const key = UI.apiKey.value.trim();
    const videoUrl = UI.url.value.trim();

    if (!apiKey || !url) return alert('请填写完整信息');

    setLoadingState(true);

    try {
        await streamRequest(key, videoUrl);
    } catch (err) {
        handleError(err.message);
    }
}

async function streamRequest(apiKey, url) {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, url })
    });

    if (!response.ok) throw new Error(`HTTP 异常: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            const rawData = line.replace('data: ', '').trim();
            if (rawData === '[DONE]') {
                finishGeneration();
                return;
            }

            try {
                const json = JSON.parse(rawData);
                if (json.text) {
                    fullContent += json.text;
                    renderMarkdown(fullContent);
                } else if (json.error) {
                    throw new Error(json.error);
                }
            } catch (e) {
                console.warn("解析碎片数据中...");
            }
        }
    }
}

function renderMarkdown(text) {
    // 清洗 AI 冗余提示
    const cleanText = text.replace(/^(好的|以下是).*?[:：]\n*/, '').trimStart();
    UI.content.innerHTML = marked.parse(cleanText);
}

function setLoadingState(isLoading) {
    UI.btn.disabled = isLoading;
    UI.btn.innerText = isLoading ? '内容深度解析中...' : '开始生成';
    UI.btn.style.opacity = isLoading ? '0.6' : '1';
    
    if (isLoading) {
        UI.wrapper.classList.remove('hidden');
        UI.loader.classList.remove('hidden');
        UI.content.innerHTML = '';
        UI.status.innerText = '正在同步数据...';
        UI.status.classList.remove('text-red-600');
    }
}

function finishGeneration() {
    setLoadingState(false);
    UI.btn.innerText = '生成另一个视频';
    UI.title.innerText = '继续重构新视频';
    UI.loader.classList.add('hidden');
    UI.url.value = ''; // 成功后清空 url 体现交互友好
}

function handleError(msg) {
    setLoadingState(false);
    UI.status.innerText = `错误: ${msg}`;
    UI.status.classList.add('text-red-600');
    UI.btn.innerText = '重新生成';
}