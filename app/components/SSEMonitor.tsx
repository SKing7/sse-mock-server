import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Square } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SSEMonitor({
  url,
  onUrlChange,
  isMonitoring,
  onStartMonitoring,
  onStopMonitoring,
}) {
  const startMonitoring = () => {
    onStartMonitoring();
  };
  const stopMonitoring = () => {
    onStopMonitoring();
  };
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            SSE 监听器
          </CardTitle>
          <CardDescription>启动Chrome实例监听指定页面的SSE请求</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">目标URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://example.com"
              disabled={isMonitoring}
            />
          </div>

          <div className="flex gap-2">
            {!isMonitoring ? (
              <Button onClick={startMonitoring} className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                开始监听
              </Button>
            ) : (
              <Button
                onClick={stopMonitoring}
                variant="destructive"
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-2" />
                停止监听
              </Button>
            )}
          </div>

          {isMonitoring && (
            <Badge variant="secondary" className="w-full justify-center">
              正在监听中...
            </Badge>
          )}
        </CardContent>
      </Card>
    </>
  );
}
