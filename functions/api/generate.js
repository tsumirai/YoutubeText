import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
    const { request } = context;
    const { url: videoUrl, apiKey } = await request.json();

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
        try {
            const videoIdMatch = videoUrl.match(/(?:v=|be\/)([^& \n?]+)/);
            const videoId = videoIdMatch ? videoIdMatch[1] : videoUrl;
            const transcriptConfig = await YoutubeTranscript.fetchTranscript(videoId);
            const transcript = transcriptConfig.map(item => item.text).join(' ');

            const ai = new GoogleGenAI({ apiKey });
            
            // 调用gemini模型
            const response = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: `整理成HTML深度文章：\n${transcript}` }] }]
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
        } catch (error) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
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