"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPresetFiles } from "@/lib/dataFetcher";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import SSEMonitor from "./components/SSEMonitor";
import Mockserver from "./components/MockServer";
import SSERequestDetail from "./components/SSERequestDetail";

export default function Component() {
  const [url, setUrl] = useState("https://web-dev.wenxiaobai.com/");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isMockServerRunning, setIsMockServerRunning] = useState(false);
  const [sseRequests, setSseRequests] = useState([]);
  const [logs, setLogs] = useState("");
  const [presetDatas, setPresetDatas] = useState({ files: [] });

  useEffect(() => {
    const fetchPresetData = async () => {
      try {
        const data = await getPresetFiles();
        setPresetDatas(data);
      } catch (error) {
        setLogs((prev) => prev + `获取预设数据失败: ${error.message}\n`);
      }
    };
    fetchPresetData();
  }, []);

  const startMonitoring = async () => {
    setIsMonitoring(true);
    setLogs("开始监听SSE请求...\n");

    try {
      const response = await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, action: "start" }),
      });

      const data = await response.json();
      setLogs((prev) => prev + `监听已启动: ${data.message}\n`);
    } catch (error) {
      setLogs((prev) => prev + `错误: ${error.message}\n`);
      setIsMonitoring(false);
    }
  };

  const stopMonitoring = async () => {
    try {
      const response = await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      const data = await response.json();
      setSseRequests(data.sseRequests || []);
      setLogs(
        (prev) =>
          prev +
          `监听已停止，捕获到 ${data.sseRequests?.length || 0} 个SSE请求\n`
      );
    } catch (error) {
      setLogs((prev) => prev + `错误: ${error.message}\n`);
    }

    setIsMonitoring(false);
  };

  const startMockServer = async (params) => {
    if (!params.conversationId) {
      alert("请提供ConversationId");
      return;
    }
    if (!params.presetData) {
      alert("请先选择一个预设数据文件");
      return;
    }
    try {
      const response = await fetch("/api/mock-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          params,
        }),
      });

      const data = await response.json();
      setIsMockServerRunning(true);
      setLogs((prev) => prev + `Mock服务器已启动: ${data.message}\n`);
    } catch (error) {
      setLogs((prev) => prev + `错误: ${error.message}\n`);
    }
  };

  const stopMockServer = async () => {
    try {
      const response = await fetch("/api/mock-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      setIsMockServerRunning(false);
      setLogs((prev) => prev + "Mock服务器已停止\n");
    } catch (error) {
      setLogs((prev) => prev + `错误: ${error.message}\n`);
    }
  };



  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SSE 监听器 & Mock 服务器</h1>
        <p className="text-muted-foreground">
          监听网页中的Server-Sent Events请求，保存数据并创建Mock服务器
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 监听控制面板 */}
        <SSEMonitor
          url={url}
          onUrlChange={setUrl}
          isMonitoring={isMonitoring}
          onStartMonitoring={startMonitoring}
          onStopMonitoring={stopMonitoring}
        />
        {/* Mock服务器控制面板 */}
        <Mockserver
          isMockServerRunning={isMockServerRunning}
          presetDatas={presetDatas}
          onStartMockServer={startMockServer}
          onStopMockServer={stopMockServer}
        />
      </div>

      {/* SSE请求列表 */}
      {sseRequests.length > 0 && (
        <SSERequestDetail sseRequests={sseRequests} />
      )}

      <Separator className="my-6" />
      {/* 日志面板 */}
      <Card>
        <CardHeader>
          <CardTitle>运行日志</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={logs}
            readOnly
            className="min-h-[200px] font-mono text-sm"
            placeholder="日志将在这里显示..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
