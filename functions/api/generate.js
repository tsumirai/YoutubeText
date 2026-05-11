import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
    const { request } = context;
    const { url: videoUrl, apiKey } = await request.json();

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
        const videoIdMatch = videoUrl.match(/(?:v=|be\/)([^& \n?]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : videoUrl;

        try {
            const transcriptConfig = await YoutubeTranscript.fetchTranscript(videoId).catch(err => {
                // 捕获特定的字幕禁用错误
                if (err.message.includes("Transcript is disabled")) {
                    throw new Error("该视频禁用了字幕功能，AI 无法读取内容。请换一个有字幕的视频试试。");
                }
                throw err;
            });

            const transcript = transcriptConfig.map(item => item.text).join(' ');

            const ai = new GoogleGenAI({ apiKey });

            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {            
                // 调用gemini模型
                const response = await ai.models.generateContentStream({
                    model: "gemini-2.5-flash",
                    contents: [{ role: "user", parts: [{ 
                        text: `你是一位专业的技术商业分析师。我将为你提供一段 YouTube 视频的原始字幕（Transcript），请你将其整理成一份深度阅读笔记。
                        严禁包含任何开场白（如“好的”、“这是整理后的...”）或结束语。

                        - 主标题： 使用 # 标记标题内容。
                        - 章节：  将全文划分为适当个数个核心章节，使用 ## 标记章节名称。
                        - 子议题： 在每个章节下，使用 ### 标记议题名称。
                        - 视觉风格： 适当使用粗体强调核心结论。
                        内容结构：
                            模仿 a16z 访谈风格，将口语化的字幕重构为逻辑严密的问答。
                            提问者姓名（如Jen）： 提炼该段落讨论的核心问题
                            回答者姓名（如Mark）： 提炼核心观点，采用书面化、逻辑清晰的段落进行复述，保留原意但去除口语赘述
                        
                        输出严格要求： 
                            1. 只准返回 Markdown 格式的正文内容。
                            2. 禁止包含 <html>, <head>, <style>, <body> 标签。
                            3. 禁止包含任何开场白或解释性文字。
                            4. 禁止使用 \`\`\`markdown 包装，直接开始输出正文。
                            5. 必须使用 # 标题 和 ## 副标题 来组织结构。

                        以下是视频字幕内容：
                        ${transcript}` }]
                    }]
                });

                // 遍历返回的数据
                for await (const chunk of response) {
                    let partText = "";
                    try {
                        partText = typeof chunk.text === 'function' ? chunk.text() : chunk.candidates?.[0]?.content?.parts?.[0]?.text;
                    } catch (e) {
                        partText = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
                    }

                    if (partText) {
                        // 确保 text 是一个纯字符串
                        await writer.write(encoder.encode(`data: ${JSON.stringify({ text: partText })}\n\n`));
                    }
                }
                await writer.write(encoder.encode('data: [DONE]\n\n'));
                break;
            }
        } catch (error) {
            if (error.message.includes("503") || error.message.includes("high demand")) {
                attempts++;
                console.log(`API 高负载，正在进行第 ${attempts} 次重试...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // 等待几秒再重试
            } else {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            }
        } finally {
            await writer.close();
        }
    })();

    return new Response(readable, {
        headers: { 
            "Content-Type": "text/event-stream", 
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked" 
        }
    });
}