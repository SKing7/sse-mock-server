import { NextRequest, NextResponse } from "next/server";
import path from "path"
import fs from "fs/promises"
const JSON_DIRECTORY = path.join(process.cwd(), 'preset-data');

export async function GET() {
    try {
        const files = await fs.readdir(JSON_DIRECTORY);
        const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
        return NextResponse.json({ files: jsonFiles });
    } catch (err) {
        // 优雅地处理目录不存在的情况
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            console.log(`Directory not found: ${JSON_DIRECTORY}. Returning empty list.`);
            // 如果目录不存在，返回一个空的文件列表
            return NextResponse.json({ files: [] });
        }

        // 对于其他错误，记录日志并返回 500 状态码
        console.error('Error reading preset-data directory:', err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Unable to scan directory', details: message }, { status: 500 });
    }
}