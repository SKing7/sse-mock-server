import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {  Server, Square } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Mockserver({
  sseRequests,
  isMockServerRunning,
  presetDatas,
  onSelectPreset,
  onStartMockServer,
  onStopMockServer,
}) {

  const downloadMockData = () => {
    const dataStr = JSON.stringify(sseRequests, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sse-mock-data.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Mock 服务器
        </CardTitle>
        <CardDescription>使用捕获的数据启动SSE Mock服务器</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          捕获到的SSE请求: <Badge variant="outline">{sseRequests.length}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          <Select onValueChange={onSelectPreset}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择Mock数据" />
            </SelectTrigger>
            <SelectContent>
              {presetDatas.files.map((preset, index) => (
                <SelectItem key={index} value={preset}>
                  {preset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {!isMockServerRunning ? (
            <Button onClick={onStartMockServer} className="flex-1">
              <Server className="w-4 h-4 mr-2" />
              启动Mock服务器
            </Button>
          ) : (
            <Button
              onClick={onStopMockServer}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              停止Mock服务器
            </Button>
          )}

          {/* <Button onClick={downloadMockData} variant="outline">
            <Download className="w-4 h-4" />
          </Button> */}
        </div>

        {isMockServerRunning && (
          <Badge variant="secondary" className="w-full justify-center">
            Mock服务器运行中 - http://localhost:3001
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
